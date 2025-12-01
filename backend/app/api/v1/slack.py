from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import httpx
from typing import Optional
from ...core.config import settings
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/share-to-slack")
async def share_to_slack(
    file: UploadFile = File(...),
    filename: Optional[str] = Form(None),
    initial_comment: Optional[str] = Form(None)
):
    """
    Upload a video file to Slack channel.
    
    Args:
        file: The video file to upload
        filename: Optional custom filename
        initial_comment: Optional message to accompany the video
    
    Returns:
        JSON response with success status and Slack file info
    """
    if not settings.SLACK_BOT_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Slack bot token is not configured. Please set SLACK_BOT_TOKEN in your .env file."
        )
    
    if not settings.SLACK_CHANNEL_ID:
        raise HTTPException(
            status_code=500,
            detail="Slack channel ID is not configured. Please set SLACK_CHANNEL_ID in your .env file."
        )
    
    try:
        # Read the file content
        file_content = await file.read()
        
        # Use provided filename or fall back to original filename
        upload_filename = filename or file.filename or "video.mp4"
        
        # Default initial comment if none provided
        if not initial_comment:
            initial_comment = f"🎬 New video generated: {upload_filename}"
        
        logger.info(f"Uploading file to Slack: {upload_filename} ({len(file_content)} bytes)")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Step 1: Get upload URL using files.getUploadURLExternal
            logger.info("Step 1: Getting upload URL from Slack")
            url_response = await client.post(
                "https://slack.com/api/files.getUploadURLExternal",
                headers={
                    "Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}",
                },
                data={
                    "filename": upload_filename,
                    "length": len(file_content)
                }
            )
            
            url_data = url_response.json()
            
            if not url_data.get("ok"):
                error_msg = url_data.get("error", "Unknown error")
                logger.error(f"Slack API error (getUploadURL): {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to get Slack upload URL: {error_msg}"
                )
            
            upload_url = url_data.get("upload_url")
            file_id = url_data.get("file_id")
            
            logger.info(f"Step 2: Uploading file to Slack (file_id: {file_id})")
            
            # Step 2: Upload the file to the URL
            upload_response = await client.post(
                upload_url,
                files={
                    "file": (upload_filename, file_content, file.content_type or "video/mp4")
                }
            )
            
            if upload_response.status_code != 200:
                logger.error(f"File upload failed with status: {upload_response.status_code}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload file to Slack storage"
                )
            
            logger.info("Step 3: Completing upload and sharing to channel")
            
            # Step 3: Complete the upload and share to channel
            # Prepare files parameter as JSON string
            files_param = json.dumps([{
                "id": file_id,
                "title": upload_filename
            }])
            
            complete_response = await client.post(
                "https://slack.com/api/files.completeUploadExternal",
                headers={
                    "Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}",
                },
                data={
                    "files": files_param,
                    "channel_id": settings.SLACK_CHANNEL_ID,
                    "initial_comment": initial_comment
                }
            )
            
            complete_data = complete_response.json()
            
            if not complete_data.get("ok"):
                error_msg = complete_data.get("error", "Unknown error")
                logger.error(f"Slack API error (completeUpload): {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to complete Slack upload: {error_msg}"
                )
        
        logger.info("File uploaded to Slack successfully!")
        
        # Extract file info from response
        files_list = complete_data.get("files", [])
        file_info = files_list[0] if files_list else {}
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Video shared to Slack successfully!",
                "file_info": {
                    "id": file_info.get("id"),
                    "name": file_info.get("name"),
                    "title": file_info.get("title"),
                }
            }
        )
        
    except httpx.TimeoutException:
        logger.error("Slack upload timeout")
        raise HTTPException(
            status_code=504,
            detail="Request to Slack timed out. Please try again."
        )
    except Exception as e:
        logger.error(f"Error uploading to Slack: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while sharing to Slack: {str(e)}"
        )

