"""One-time ONNX export of the Kiswahili NER model for offline use.

Runs on an online machine with Python + `optimum[onnxruntime]` installed:

    pip install "optimum[onnxruntime]" transformers torch
    pnpm ner:convert            # writes .qvac/models/swahili-ner-onnx
    pnpm ner:fetch              # verifies + fetches the English model

Source: eolang/Swahili-NER-BertBase-Cased (BERT-base, Apache-2.0, WikiAnn sw).
Output keeps the original tokenizer + config plus q8-quantized + fp32 ONNX
weights, matching the layout `transformers.js` expects for local dirs.
Override source/dest with NER_SW_SRC / NER_MODEL_SW.
"""

import os
import shutil
import subprocess
import sys

SRC = os.environ.get("NER_SW_SRC", "eolang/Swahili-NER-BertBase-Cased")
DEST = os.environ.get("NER_MODEL_SW", os.path.join(".qvac", "models", "swahili-ner-onnx"))


def main() -> None:
    if os.path.exists(os.path.join(DEST, "model_quantized.onnx")):
        print(f"Swahili NER already exported at {DEST}; skipping.")
        return
    os.makedirs(DEST, exist_ok=True)
    print(f"Exporting {SRC} to ONNX in {DEST} ...")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "optimum.exporters.onnx",
            "--model",
            SRC,
            "--task",
            "token-classification",
            DEST,
        ],
        check=True,
    )
    print("Quantizing to int8 (model_quantized.onnx) ...")
    subprocess.run(
        [
            sys.executable,
            "-c",
            "from optimum.onnxruntime import ORTQuantizer; "
            "from optimum.onnxruntime.configuration import AutoQuantizationConfig; "
            f"q = ORTQuantizer.from_pretrained('{DEST}'); "
            "q.quantize(save_dir='" + DEST + "', "
            "weights_output_name='model_quantized.onnx', "
            "quantization_config=AutoQuantizationConfig.avx512_vnni()); "
            "print('quantized')",
        ],
        check=True,
    )
    # Keep the tree small: drop the fp32 copy only if quantization succeeded.
    fp32 = os.path.join(DEST, "model.onnx")
    q8 = os.path.join(DEST, "model_quantized.onnx")
    if os.path.exists(q8):
        print(f"Swahili NER ready at {DEST} (runtime loads model_quantized.onnx).")
    else:
        print(f"WARNING: quantization output missing; runtime will use {fp32}.", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"ONNX export failed (exit {e.returncode}).", file=sys.stderr)
        shutil.rmtree(DEST, ignore_errors=True)
        raise SystemExit(1)
