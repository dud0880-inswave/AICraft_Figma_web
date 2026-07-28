#!/usr/bin/env bash
# ============================================================
# 개발 서버(5181) + 클라이언트(5180, 외부접속 허용) 백그라운드 실행
# 터미널을 닫아도 nohup 으로 살아있습니다.
# ============================================================
set -euo pipefail

# 이 스크립트의 상위 폴더 = 프로젝트 루트
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

TS="$(date '+%Y-%m-%d %H:%M:%S')"

# 이미 실행 중이면 중단
if lsof -nP -iTCP:5181 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  이미 5181(서버)이 실행 중입니다. 먼저 ./scripts/stop.sh 를 실행하세요."
  exit 1
fi

echo "[$TS] 서버 + 클라이언트 시작..." | tee -a "$LOG_DIR/server.log" "$LOG_DIR/client.log" >/dev/null

# --- 서버 (API :5181) ---
nohup npm run dev:server >>"$LOG_DIR/server.log" 2>&1 &
echo $! > "$LOG_DIR/server.pid"

# --- 클라이언트 (vite :5180, 외부 접속 허용) ---
nohup npm run dev -w @aicraft/client -- --host 0.0.0.0 >>"$LOG_DIR/client.log" 2>&1 &
echo $! > "$LOG_DIR/client.pid"

echo "------------------------------------------------------------"
echo "✅ 시작됨"
echo "  서버      PID $(cat "$LOG_DIR/server.pid")  → 로그: $LOG_DIR/server.log"
echo "  클라이언트 PID $(cat "$LOG_DIR/client.pid")  → 로그: $LOG_DIR/client.log"
echo ""
echo "  로그 실시간 보기 : tail -f $LOG_DIR/client.log"
echo "  종료            : ./scripts/stop.sh"
echo "  상태 확인       : ./scripts/status.sh"
echo "------------------------------------------------------------"
