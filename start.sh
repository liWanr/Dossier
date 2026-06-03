#!/bin/bash

PORT=3000

cleanup() {
  echo ""
  echo "正在终止进程..."
  kill "$DEV_PID" 2>/dev/null
  wait "$DEV_PID" 2>/dev/null
  exit 0
}

trap cleanup INT TERM

# 收集所有冲突 PID：next dev 进程 + 占用端口的进程
CONFLICT_PIDS=$(
  {
    pgrep -f "next dev" 2>/dev/null
    pgrep -f "next-server" 2>/dev/null
    # Next.js 自己记录的 PID
    [ -f .next/dev/logs/next-development.log ] && \
      grep -oP '(?<="pid":)\d+' .next/dev/logs/next-development.log 2>/dev/null | tail -1
    lsof -ti tcp:"$PORT" 2>/dev/null
  } | sort -u | grep -v "^$$"  # 排除脚本自身
)

if [ -n "$CONFLICT_PIDS" ]; then
  echo "发现以下冲突进程：$(echo $CONFLICT_PIDS | tr '\n' ' ')"
  read -r -p "是否全部终止并继续启动？[y/N] " answer
  case "$answer" in
    [yY])
      echo "$CONFLICT_PIDS" | xargs kill 2>/dev/null
      # 等待端口释放，最多 5 秒
      for i in $(seq 1 10); do
        lsof -ti tcp:"$PORT" > /dev/null 2>&1 || break
        sleep 0.5
      done
      echo "冲突进程已清理"
      ;;
    *)
      echo "已取消启动"
      exit 1
      ;;
  esac
fi

npm run dev &
DEV_PID=$!

wait "$DEV_PID"
