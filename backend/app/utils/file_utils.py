"""
Utility functions for safe file and directory operations.
"""
import shutil
import logging
from pathlib import Path
from typing import Union

logger = logging.getLogger(__name__)


def cleanup_temp_path(path: Union[str, Path]) -> None:
    """
    Safely delete a temporary file or directory.
    
    This function is designed to be used with FastAPI BackgroundTasks
    to ensure temp files are cleaned up after the response is sent.
    
    Args:
        path: Path to file or directory to delete
        
    Note:
        Uses ignore_errors=True to prevent exceptions from propagating
        and breaking the cleanup process. Logs warnings on failure.
    """
    try:
        path_obj = Path(path) if isinstance(path, str) else path
        
        if not path_obj.exists():
            logger.debug(f"Cleanup skipped - path does not exist: {path}")
            return
            
        if path_obj.is_dir():
            shutil.rmtree(path_obj, ignore_errors=True)
            logger.info(f"Cleaned up temp directory: {path}")
        else:
            path_obj.unlink(missing_ok=True)
            logger.info(f"Cleaned up temp file: {path}")
            
    except Exception as e:
        # Log but don't raise - cleanup failures shouldn't break the app
        logger.warning(f"Failed to cleanup temp path: {path}, error: {e}")

