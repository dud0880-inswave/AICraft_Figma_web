#!/usr/bin/env bash
# ============================================================
# start.sh 로 띄운 서버/클라이언트 종료
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

echo "종료 중..."

# 포트를 실제로 점유한 프로세스(자식 tsx/vite 포함) 종료
for PORT in 5180 5181; do
  PIDS="$(lsof -nP -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "  포트 $PORT 종료: $PIDS"
    kill $PIDS 2>/dev/null || true
  fi
done

# 저장해 둔 npm 부모 PID 정리
for name in server client; do
  PIDFILE="$LOG_DIR/$name.pid"
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
done

echo "✅ 종료 완료."
