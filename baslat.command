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
echo "  veya bu pencereyi kapatabilirsiniz."
echo "==================================================="
echo ""

# Tarayıcıyı 1 saniye sonra arka planda aç
(sleep 1 && open "http://localhost:3100") &

# Sunucuyu başlat
node --disable-warning=ExperimentalWarning backend/server.js
