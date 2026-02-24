#!/bin/bash
# Run this script once to rename placeholder directories to Next.js dynamic route names
set -e
BASE="$(dirname "$0")/src/app/api"

mv "$BASE/auth/x_nextauth" "$BASE/auth/[...nextauth]"
mv "$BASE/ar/stage/id_tmp" "$BASE/ar/stage/[id]"
mv "$BASE/tracks/id_tmp" "$BASE/tracks/[id]"
mv "$BASE/stages/id_tmp" "$BASE/stages/[id]"
mv "$BASE/visualizations/id_tmp" "$BASE/visualizations/[id]"
mv "$BASE/admin/users/id_tmp" "$BASE/admin/users/[id]"
echo "All dynamic route directories renamed successfully!"
