#!/usr/bin/env bash
# ============================================================
# 서버/클라이언트 실행 상태 + 접속 주소 확인
# ============================================================
echo "== 포트 상태 =="
for PORT in 5181 5180; do
  if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  [$PORT] ● 실행 중"
    lsof -nP -iTCP:$PORT -sTCP:LISTEN | tail -n +2 | awk '{print "        PID " $2 "  " $9}'
  else
    echo "  [$PORT] ○ 꺼짐"
  fi
done

echo ""
echo "== 접속 주소 =="
# macOS: en0(유선)/en1(무선), Linux: hostname -I
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo "  로컬     : http://localhost:5180"
[ -n "$IP" ] && echo "  외부(LAN): http://$IP:5180"
