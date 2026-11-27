#!/usr/bin/env python3
"""Add a user-supplied card background (PNG, e.g. exported from Canva, NO names/dates on it).
usage: add_design.py <id> <image.png>
Writes public/cards/<id>-top.webp and <id>-bottom.webp (top/bottom 45%) and prints the flat
middle colour. Then add <id> to: InvitationDesignId (src/types/velora.ts), INVITATION_DESIGNS
(src/utils/veloraLogic.ts), THEMES + ART_IDS (src/components/InvitationCardRenderer.tsx),
and a price in config/invitationPricing.templatePrices (admin screen).
To REMOVE a design: delete those entries + the two webp files (old invitations fall back to 'royal')."""
import sys
from PIL import Image
i, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); w, h = im.size
k = int(h * .45)
im.crop((0, 0, w, k)).save(f'public/cards/{i}-top.webp', quality=82)
im.crop((0, h - k, w, h)).save(f'public/cards/{i}-bottom.webp', quality=82)
print('middle colour', '#%02x%02x%02x' % im.getpixel((w // 2, h // 2)))
