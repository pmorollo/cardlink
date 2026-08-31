#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:?informe o diretório de saída}"
source_one="${2:?informe a imagem 1}"
source_two="${3:?informe a imagem 2}"
source_three="${4:?informe a imagem 3}"

mkdir -p "$output_dir"

brand_font="DejaVu-Sans"
brand_bold="DejaVu-Sans-Bold"

make_post() {
  local source="$1"
  local output="$2"
  local panel_gravity="$3"
  local headline="$4"
  local subline="$5"
  local price="$6"

  convert "$source" -resize 1080x1080! \
    -fill '#080812B8' -stroke none -draw "roundrectangle 42,42,658,1038,34,34" \
    -fill '#A78BFA' -font "$brand_bold" -pointsize 30 -gravity northwest -annotate +82+92 'CardLink' \
    -fill white -font "$brand_bold" -pointsize 64 -interline-spacing 5 -gravity northwest -annotate +82+208 "$headline" \
    -fill '#DDD6FE' -font "$brand_font" -pointsize 30 -interline-spacing 6 -gravity northwest -annotate +82+560 "$subline" \
    -fill '#8B5CF6' -draw 'roundrectangle 82,850,568,930,38,38' \
    -fill white -font "$brand_bold" -pointsize 28 -gravity northwest -annotate +112+900 "$price" \
    -fill '#A1A1AA' -font "$brand_font" -pointsize 22 -gravity northwest -annotate +82+988 'cardlink.digitalnexoapp.com' \
    "$output"
}

make_post "$source_one" "$output_dir/post-01-um-unico-link.jpg" west \
  $'Seu negócio em\num único link.' \
  $'Fotos, serviços, avaliações,\nredes sociais e WhatsApp.' \
  'A partir de R$ 12,90/mês'

convert "$source_two" -resize 1080x1080! \
  -fill '#080812C8' -stroke none -draw 'roundrectangle 514,42,1038,1038,34,34' \
  -fill '#A78BFA' -font "$brand_bold" -pointsize 30 -gravity northwest -annotate +566+92 'CardLink' \
  -fill white -font "$brand_bold" -pointsize 55 -interline-spacing 4 -gravity northwest -annotate +566+205 $'Tudo o que seu\ncliente precisa\nver antes de\nchamar você.' \
  -fill '#DDD6FE' -font "$brand_font" -pointsize 27 -interline-spacing 5 -gravity northwest -annotate +566+625 $'Uma apresentação\nprofissional, simples\nde compartilhar.' \
  -fill '#8B5CF6' -draw 'roundrectangle 566,850,990,930,38,38' \
  -fill white -font "$brand_bold" -pointsize 28 -gravity northwest -annotate +596+900 'Conheça o CardLink' \
  -fill '#A1A1AA' -font "$brand_font" -pointsize 18 -gravity northwest -annotate +566+988 'cardlink.digitalnexoapp.com' \
  "$output_dir/post-02-apresentacao-profissional.jpg"

convert "$source_three" -resize 1080x1080! \
  -fill '#080812D4' -stroke none -draw 'roundrectangle 42,42,1038,350,34,34' \
  -fill '#A78BFA' -font "$brand_bold" -pointsize 30 -gravity northwest -annotate +82+92 'CardLink' \
  -fill white -font "$brand_bold" -pointsize 55 -interline-spacing 5 -gravity northwest -annotate +82+178 $'Compartilhe por link,\nWhatsApp ou QR Code.' \
  -fill '#080812C8' -draw 'roundrectangle 238,884,842,1038,34,34' \
  -fill '#DDD6FE' -font "$brand_font" -pointsize 26 -gravity north -annotate +0+918 'Cartão digital profissional' \
  -fill white -font "$brand_bold" -pointsize 30 -gravity north -annotate +0+970 'A partir de R$ 12,90/mês' \
  "$output_dir/post-03-compartilhe.jpg"

make_story() {
  local source="$1"
  local output="$2"
  local headline="$3"
  local subline="$4"

  convert "$source" -resize 1080x1920^ -gravity center -extent 1080x1920 -blur 0x32 -modulate 60,90,100 \
    \( "$source" -resize 980x980 \) \
    -gravity center -geometry +0+70 -compose over -composite \
    -fill '#080812DC' -stroke none -draw 'roundrectangle 48,48,1032,500,40,40' \
    -fill '#A78BFA' -font "$brand_bold" -pointsize 34 -gravity northwest -annotate +92+110 'CardLink' \
    -fill white -font "$brand_bold" -pointsize 68 -interline-spacing 6 -gravity northwest -annotate +92+224 "$headline" \
    -fill '#080812E6' -draw 'roundrectangle 48,1530,1032,1872,40,40' \
    -fill '#DDD6FE' -font "$brand_font" -pointsize 34 -interline-spacing 8 -gravity northwest -annotate +92+1615 "$subline" \
    -fill '#8B5CF6' -draw 'roundrectangle 92,1762,680,1842,40,40' \
    -fill white -font "$brand_bold" -pointsize 30 -gravity northwest -annotate +126+1813 'A partir de R$ 12,90/mês' \
    "$output"
}

make_story "$source_one" "$output_dir/story-01-um-unico-link.jpg" \
  $'Seu negócio em\num único link.' \
  $'Reúna serviços, fotos, avaliações,\nredes sociais e WhatsApp.'

make_story "$source_two" "$output_dir/story-02-apresentacao-profissional.jpg" \
  $'Antes do contato,\nmostre seu melhor.' \
  $'Crie uma apresentação profissional\ne atualize quando quiser.'

make_story "$source_three" "$output_dir/story-03-link-qr-whatsapp.jpg" \
  $'Um link.\nMuitas formas\nde compartilhar.' \
  $'Envie pelo WhatsApp, publique nas\nredes ou use o QR Code.'

identify -format '%f %wx%h\n' "$output_dir"/*.jpg
