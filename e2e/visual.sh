#!/bin/bash
set -e

PORT=8092
BASE_URL="http://localhost:$PORT"
PASS=0
FAIL=0
ERRORS=()

log_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
log_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

echo "🔨 Building web export..."
if ! npx expo export --platform web > /tmp/expo-export.log 2>&1; then
  echo "❌ Web export failed:"; tail -20 /tmp/expo-export.log; exit 1
fi

echo "🌐 Starting static server on port $PORT..."
npx serve dist --listen $PORT --single > /tmp/serve.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  npx agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 15); do
  if curl -s "$BASE_URL" > /dev/null 2>&1; then break; fi
  sleep 1
done

npx agent-browser open "$BASE_URL" 2>/dev/null
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser wait 3000 2>/dev/null

TITLE=$(npx agent-browser get title 2>/dev/null)
if echo "$TITLE" | grep -qi "SPARK LIST"; then
  log_pass "Page title 正確"
else
  log_fail "Page title 不符（got: $TITLE）"
fi

BODY_TEXT=$(npx agent-browser get text body 2>/dev/null)
if echo "$BODY_TEXT" | grep -q "我的"; then
  log_pass "「我的」分頁文字存在"
else
  log_fail "找不到「我的」分頁文字"
fi

if echo "$BODY_TEXT" | grep -q "冷靜區"; then
  log_pass "「冷靜區」分頁文字存在"
else
  log_fail "找不到「冷靜區」分頁文字"
fi

npx agent-browser screenshot /tmp/e2e-home.png 2>/dev/null

echo "✅ 通過: $PASS  ❌ 失敗: $FAIL"
[ $FAIL -eq 0 ]
