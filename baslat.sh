#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================="
echo "  🍰 Fay Party House Başlatılıyor..."
echo "==================================================="
echo ""
echo "  Tarayıcı açılıyor: http://localhost:3100"
echo "  Yönetim Paneli:    http://localhost:3100/admin"
echo ""
echo "  Durdurmak için Ctrl+C tuşlarına basabilir"
echo "  veya terminali kapatabilirsiniz."
echo "==================================================="
echo ""

(sleep 1 && open "http://localhost:3100") &
node --disable-warning=ExperimentalWarning backend/server.js
