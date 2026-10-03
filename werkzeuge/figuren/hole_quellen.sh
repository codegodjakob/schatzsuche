#!/usr/bin/env bash
# Holt die Rohdaten für die Figuren (nur Daten, kein fremder Programmcode):
#  - MakeHuman/MPFB2: Grundkörper, Körperformen, Skelett, Gewichte, Hautmasken (CC0)
#  - MakeHuman: Augen (CC0)
#  - Bandai Namco Research Motion Dataset: Bewegungsaufnahmen (CC BY-NC 4.0)
# Ziel: werkzeuge/figuren/quellen/ (wird nicht ins Projekt eingecheckt)
set -euo pipefail
ZIEL="$(cd "$(dirname "$0")" && pwd)/quellen"
mkdir -p "$ZIEL"
cd "$ZIEL"

hole() { # hole <repo-url> <ordner> <pfad>...
  local url="$1" ordner="$2"; shift 2
  if [ ! -d "$ordner/.git" ]; then
    GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 --filter=blob:none --no-checkout "$url" "$ordner"
  fi
  git -C "$ordner" sparse-checkout set --no-cone "$@"
  git -C "$ordner" checkout -q
}

hole https://github.com/makehumancommunity/mpfb2 mpfb2 \
  '/LICENSE*' \
  '/src/mpfb/data/3dobjs/' \
  '/src/mpfb/data/mesh_metadata/' \
  '/src/mpfb/data/rigs/standard/rig.game_engine.json' \
  '/src/mpfb/data/rigs/standard/weights.game_engine.json' \
  '/src/mpfb/data/targets/macrodetails/' \
  '/src/mpfb/data/targets/breast/' \
  '/src/mpfb/data/textures/'

hole https://github.com/makehumancommunity/makehuman makehuman \
  '/LICENSE*' '/makehuman/data/eyes/'

B=/dataset/Bandai-Namco-Research-Motiondataset
hole https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset bandai \
  '/README.md' "$B-1/LICENSE" "$B-2/LICENSE" \
  "$B-1/data/dataset-1_walk_*" "$B-1/data/dataset-1_run_*" "$B-1/data/dataset-1_dash_*" \
  "$B-1/data/dataset-1_slash_*" "$B-1/data/dataset-1_punch_*" "$B-1/data/dataset-1_kick_*" \
  "$B-1/data/dataset-1_walk-back_*" \
  "$B-2/data/dataset-2_wave-right-hand_normal_00*" "$B-2/data/dataset-2_wave-right-hand_elderly_00*" \
  "$B-2/data/dataset-2_raise-up-right-hand_normal_00*"

echo "Quellen liegen in $ZIEL"
