"""One-time ONNX export of the EN→SW translation model for offline use.

Runs on an online machine with Python + `optimum[onnxruntime]` installed:

    pip install "optimum[onnxruntime]" transformers torch
    pnpm mt:convert            # writes .qvac/models/mt-en-sw-onnx
    pnpm mt:fetch              # smoke-tests the export

Source: Helsinki-NLP/opus-mt-en-sw (MarianMT, Apache-2.0, ~75M params).
Output keeps the original tokenizer + config plus q8-quantized ONNX
weights, matching the layout `transformers.js` expects for local dirs.
Override source/dest with MT_SRC / MT_MODEL_EN_SW.
"""

import os
import shutil
import subprocess
import sys

SRC = os.environ.get("MT_SRC", "Helsinki-NLP/opus-mt-en-sw")
DEST = os.environ.get("MT_MODEL_EN_SW", os.path.join(".qvac", "models", "mt-en-sw-onnx"))


def main() -> None:
    if os.path.exists(os.path.join(DEST, "model_quantized.onnx")) or os.path.exists(
        os.path.join(DEST, "encoder_model_quantized.onnx")
    ):
        print(f"MT model already exported at {DEST}; skipping.")
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
            "translation",
            DEST,
        ],
        check=True,
    )
    print("Quantizing to int8 ...")
    subprocess.run(
        [
            sys.executable,
            "-c",
            "from optimum.onnxruntime import ORTQuantizer; "
            "from optimum.onnxruntime.configuration import AutoQuantizationConfig; "
            f"q = ORTQuantizer.from_pretrained('{DEST}'); "
            "q.quantize(save_dir='" + DEST + "', "
            "quantization_config=AutoQuantizationConfig.avx512_vnni()); "
            "print('quantized')",
        ],
        check=True,
    )
    # transformers.js loads only tokenizer.json (fast tokenizer); the Optimum
    # export keeps the slow SentencePiece files, so build the fast Unigram
    # tokenizer from the JOINT vocab (vocab.json piece order == model ids;
    # scores from source.spm, falling back to target.spm). Mirrors the layout
    # Xenova ships for Marian pairs. Requires `tokenizers` + `sentencepiece`.
    print("Building fast tokenizer.json (Unigram over the joint vocab) ...")
    subprocess.run(
        [
            sys.executable,
            "-c",
            "import json; "
            "import sentencepiece as spm; "
            "from tokenizers import Tokenizer, AddedToken; "
            "from tokenizers.models import Unigram; "
            "from tokenizers.pre_tokenizers import WhitespaceSplit, Metaspace, Sequence as PreSeq; "
            "from tokenizers.processors import TemplateProcessing; "
            "from tokenizers.decoders import Metaspace as MetaDec; "
            f"D = '{DEST}'; "
            "vocab = json.load(open(D + '/vocab.json')); "
            "src = spm.SentencePieceProcessor(model_file=D + '/source.spm'); "
            "tgt = spm.SentencePieceProcessor(model_file=D + '/target.spm'); "
            "def score(tok):\n"
            "    i = src.piece_to_id(tok)\n"
            "    if not src.is_unknown(i): return src.get_score(i)\n"
            "    j = tgt.piece_to_id(tok)\n"
            "    if not tgt.is_unknown(j): return tgt.get_score(j)\n"
            "    return -15.0\n"
            "ordered = sorted(vocab.items(), key=lambda kv: kv[1]); "
            "MS = chr(0x2581); "
            "tok = Tokenizer(Unigram([(t, score(t)) for t, _ in ordered], unk_id=1)); "
            "tok.pre_tokenizer = PreSeq([WhitespaceSplit(), Metaspace(replacement=MS, prepend_scheme='always')]); "
            "tok.post_processor = TemplateProcessing(single=['$A', '</s>'], pair=['$A', '</s>', '$B:1', '</s>'], special_tokens=[('</s>', 0)]); "
            "tok.decoder = MetaDec(replacement=MS, prepend_scheme='always'); "
            "[tok.add_special_tokens([AddedToken(c, single_word=False)]) for c in ['</s>', '<unk>', '<pad>']]; "
            "tok.save(D + '/tokenizer.json'); "
            "print('tokenizer written')",
        ],
        check=True,
    )
    print(f"MT model ready at {DEST}.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"ONNX export failed (exit {e.returncode}).", file=sys.stderr)
        shutil.rmtree(DEST, ignore_errors=True)
        raise SystemExit(1)
