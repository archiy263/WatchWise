"""
generate_posters.py
Generates frontend/posters.js using the FREE Wikipedia MediaWiki API (no API key needed).
Queries Wikipedia page images for each curated movie title and saves to posters.js.
Run once; takes ~2-3 minutes for 280 titles with rate limiting.
"""

import re, time, json, os
import requests

POSTERS_FILE = "frontend/posters.js"
DATA_FILE    = "frontend/data.js"
DELAY        = 0.3          # seconds between Wikipedia requests (respectful)
THUMB_SIZE   = 500          # poster width in px

# Fallback: TMDB direct CDN URLs for the most popular movies.
# These poster paths are from TMDB's public dataset, served via their open image CDN.
STATIC_FALLBACK = {
    "The Dark Knight":               "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "Inception":                     "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "Interstellar":                  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "Parasite":                      "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "Avengers Endgame":              "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    "Avengers Infinity War":         "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    "Avatar":                        "/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
    "Titanic":                       "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    "The Godfather":                 "/3bhkrj58Vtu7enYsLegofzaKQqc.jpg",
    "The Shawshank Redemption":      "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    "Pulp Fiction":                  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    "Fight Club":                    "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "Forrest Gump":                  "/saHP97rTPS5eLmrLQEqlnflNKRx.jpg",
    "Gladiator":                     "/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    "Joker":                         "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    "Barbie":                        "/iuFNMS8vlZzZmZd1U1ORIZa3MoF.jpg",
    "Oppenheimer":                   "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "Dune":                          "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    "Mad Max Fury Road":             "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
    "Get Out":                       "/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
    "Hereditary":                    "/t3zFLKCuqKNHKGHfAv5fzwKnXqN.jpg",
    "Midsommar":                     "/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg",
    "A Quiet Place":                 "/nAU74GmpUk7t5iklEp3bufwDq4n.jpg",
    "La La Land":                    "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    "Arrival":                       "/mtCQNQHzNqSvFgDpjMb9EANERVO.jpg",
    "John Wick":                     "/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg",
    "Top Gun Maverick":              "/62HCnUTHjWKSSAVQNcYW4t5c5bS.jpg",
    "Knives Out":                    "/pThyQovXQrws2hmkal2gZ6QskgI.jpg",
    "Nomadland":                     "/66A9MqXdBzGsMZHhZoJoMsL9rUw.jpg",
    "1917":                          "/iZf0KyrE25z1sage4SYFLCCrMi9.jpg",
    "Blade Runner 2049":             "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    "Gravity":                       "/kZ2nZw8D681aphje74GBGEv70xF.jpg",
    "The Revenant":                  "/oEpiUS5lFBjYfM7wVxsK9GNyHnR.jpg",
    "The Martian":                   "/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
    "Dunkirk":                       "/ebSnODDg9lbsMIaWg2uAbjn7TO5.jpg",
    "Her":                           "/yk4J7MHLn1GlGZBZTbxWUHoELqk.jpg",
    "Ex Machina":                    "/btMzCLRhBBKHXrnCwVtEjW5vdDl.jpg",
    "Eternal Sunshine of the Spotless Mind": "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    "Once Upon a Time in Hollywood": "/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg",
    "Parasite":                      "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "Squid Game":                    "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    "Stranger Things":               "/x2LSRK2Cm7MZhjluni1msVJ3wDj.jpg",
    "Breaking Bad":                  "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    "Game of Thrones":               "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    "Ozark":                         "/pCGyPEWahjBwMY9hFMHlW0Xc3EI.jpg",
    "Money Heist La Casa de Papel":  "/reEMJA1uzscCbkDMzLQuxnxgVoA.jpg",
    "The Boys":                      "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg",
    "Dark":                          "/apbrbWs5M6VVafnT5NGZTbzpKjM.jpg",
    "Mindhunter":                    "/egmIPm73XPkdrJB3YBbxgZRG0MB.jpg",
    "Peaky Blinders":                "/vUUqzWa2LnHIVqkaKVlVGkPaQca.jpg",
    "Bridgerton":                    "/luoKpgVwi1E5nQsi7W0UuKHu2Rq.jpg",
    "Euphoria":                      "/3Q9bCGGTOTIkXoz4SvZHdCXJi7b.jpg",
    "Succession":                    "/e2X81TcsCaFIKPFoRqGTJhcQkGD.jpg",
    "The Last of Us":                "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    "Wednesday":                     "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    "Loki":                          "/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg",
    "Emily in Paris":                "/9vvl6mAMBwSlnfnGJeGixKDMGT6.jpg",
    "Sex Education":                 "/jRDtfGMmOTSBkXNDSPMzd6Elp1z.jpg",
    "Narcos":                        "/rTmal9fDbwh5F0waol2hq35U4ah.jpg",
    "Orange Is the New Black":       "/hyarIHMFJEINkKKrHmWlW8iuNrd.jpg",
    "The Crown":                     "/9RiAf93fStBHKWEjSxUK8XssCON.jpg",
    "Arcane":                        "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    "Jujutsu Kaisen":                "/oTO2CxmQZz4p5BNa3JcG5HTRFE.jpg",
    "Attack on Titan":               "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    "Spirited Away":                 "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    "Your Name":                     "/q719jXXEzOoYaps6babgKnONONX.jpg",
    "Demon Slayer Mugen Train":      "/h8Rb9gBr48ODIwYZ2pvDUnONqoK.jpg",
    "My Neighbor Totoro":            "/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg",
    "Parasite":                      "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "Oldboy":                        "/iAFE3IIKB1YXSP47jfBYjMJkGn.jpg",
    "Train to Busan":                "/ocdB2NPGrD2mBfkST0gWjBGa43U.jpg",
    "The Handmaiden":                "/ywM2XLhCgsTaXRLcCkBiKfqkGEA.jpg",
    "Crouching Tiger Hidden Dragon": "/owLpbPpKFbWQPlNOCaFBD1AkQ9Y.jpg",
    "Dangal":                        "/pE9beSlSAEJXTpJMUMHuHRxEwty.jpg",
    "3 Idiots":                      "/66A9MqXdBzGsMZHhZoJoMsL9rUw.jpg",
    "PK":                            "/58CTLK5JIaASSR9Ci6TZV8AKuMO.jpg",
    "Bajrangi Bhaijaan":             "/wS9pzHmk0qFMJsrO8E9V5vH7g1n.jpg",
    "Dilwale Dulhania Le Jayenge":   "/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
    "Gully Boy":                     "/4sHeTAgNHXFsXgUiYgKiCqh0eZ3.jpg",
    "Kabir Singh":                   "/oRTPR9VRZOmXkMhIFzAJSNhiMF4.jpg",
    "Shershaah":                     "/yLtFUb7d1LPTJZ9pDa4OKNuwFlP.jpg",
    "Padmaavat":                     "/6vMP5iVBCXZsZvhzWXFSWyULWM1.jpg",
    "Bajirao Mastani":               "/xkTgEBe7e5dJjzGGiEsb3HEPsmO.jpg",
    "RRR":                           "/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg",
    "Baahubali The Beginning":       "/bGvpLQsIZnKULaxI3OZFTgPYABu.jpg",
    "Baahubali The Conclusion":      "/5vNJQJJVDgXnfcTayvl0C5VimNe.jpg",
    "KGF Chapter 1":                 "/nV3bZWGr15EEA8WuGKZqNR5edoK.jpg",
    "KGF Chapter 2":                 "/uOe2heMVwQOdvF72XaINPeXIBa2.jpg",
    "Pushpa The Rise":               "/1kXPCpgr56dOrb5iS7b5tHiNXoU.jpg",
    "Vikram":                        "/u4UHJ7fjBe1TpPSbS3FMGGO6wJW.jpg",
    "Ponniyin Selvan Part 1":        "/ooJbNXqJkrn5fKzUKZxK0r8Iu5.jpg",
}
TMDB_BASE = "https://image.tmdb.org/t/p/w500"


def get_wikipedia_poster(title):
    """Use Wikipedia MediaWiki API to get a page thumbnail/poster image. Free, no key needed."""
    search_variants = [
        title,
        f"{title} film",
        f"{title} (film)",
        f"{title} (TV series)",
    ]
    
    for query in search_variants:
        try:
            # Search for the Wikipedia page
            search_url = "https://en.wikipedia.org/w/api.php"
            search_params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 1,
            }
            resp = requests.get(search_url, params=search_params, timeout=5,
                                headers={"User-Agent": "ABEAARS/1.0 (entertainment portal; poster-fetcher)"})
            results = resp.json().get("query", {}).get("search", [])
            if not results:
                continue
            
            page_title = results[0]["title"]
            
            # Get the thumbnail for that page
            img_params = {
                "action": "query",
                "titles": page_title,
                "prop": "pageimages",
                "format": "json",
                "pithumbsize": THUMB_SIZE,
            }
            resp2 = requests.get(search_url, params=img_params, timeout=5,
                                headers={"User-Agent": "ABEAARS/1.0"})
            pages = resp2.json().get("query", {}).get("pages", {})
            page = list(pages.values())[0]
            thumb = page.get("thumbnail", {}).get("source", "")
            if thumb:
                return thumb
        except Exception as e:
            continue
        time.sleep(DELAY)
    
    return ""


def main():
    # 1. Extract all unique titles from data.js (curated section only, before KAGGLE block)
    with open(DATA_FILE, encoding="utf-8") as f:
        content = f.read()
    
    marker = "// ==== NETFLIX + PRIME VIDEO KAGGLE DATASET ===="
    curated_block = content[:content.index(marker)] if marker in content else content
    titles = list(dict.fromkeys(re.findall(r'title:"([^"]+)"', curated_block)))
    
    print(f"Found {len(titles)} curated titles to process")
    
    posters = {}
    
    # 2. Start with known TMDB static fallbacks (instant, no network needed)
    for title, path in STATIC_FALLBACK.items():
        posters[title] = TMDB_BASE + path
    print(f"  Pre-loaded {len(posters)} entries from static TMDB fallback")
    
    # 3. Fill in remaining titles using Wikipedia API
    remaining = [t for t in titles if t not in posters]
    print(f"  Fetching {len(remaining)} remaining posters from Wikipedia...")
    
    for i, title in enumerate(remaining):
        url = get_wikipedia_poster(title)
        if url:
            posters[title] = url
            print(f"  [{i+1}/{len(remaining)}] OK  : {title}")
        else:
            print(f"  [{i+1}/{len(remaining)}] MISS: {title}")
        time.sleep(DELAY)
    
    # 4. Write posters.js
    lines = []
    for title, url in posters.items():
        safe_title = title.replace('"', '\\"')
        lines.append(f'  "{safe_title}": "{url}"')
    
    js_content = "const MOVIE_POSTERS = {\n" + ",\n".join(lines) + "\n};\n"
    
    with open(POSTERS_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"\nDone! Saved {len(posters)} poster URLs to {POSTERS_FILE}")


if __name__ == "__main__":
    main()
