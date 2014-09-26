git grep '{{[^{]*|\s*translate' \
| grep -o '{{[^{]*|\s*translate' \
| sed "s/{{\s*[\"']//;s/[\"']\s*|\s*translate//" \
| sort | uniq
