## RNNoise Model

Place the RNNoise model file required by FFmpeg's `arnndn` filter in this directory.

- Recommended filename: `denoise_general.rnnn`
- Source: https://github.com/xiph/rnnoise/tree/master (see `models` directory)
- The enhancer will raise a descriptive error if the model cannot be found. Update
  `AUDIO_RNNOISE_MODEL_PATH` in `backend/.env` to point to the downloaded file if you
  choose a different location.

