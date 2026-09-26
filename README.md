# GEAR — Global AI Capability Observatory

GEAR is a source-aware public research prototype for exploring national AI capabilities through an interactive satellite-style globe.

## What is included

- Rotatable, zoomable physical globe
- NASA Blue Marble satellite imagery
- Country capability profiles
- Compute, research, chips/hardware, public investment and national-program layers
- Evidence ledger and source registry
- Side-by-side country comparison without an opaque ranking
- Conservative official-source updater
- Daily GitHub Actions refresh
- Automatic GitHub Pages deployment
- Candidate-training UI demonstrating a gated ML workflow

## Data philosophy

GEAR does **not** manufacture a single national “AI power score.” Different governments publish different metrics with different definitions. GEAR preserves the value, unit, source and context and shows missing series as missing.

The updater checks only URLs in `data/sources.json`. A parser updates a value only when a known pattern is present on an allowlisted official page. Failed extraction leaves the last verified value intact.

## Run locally

Because the site loads JSON with `fetch()`, use a local HTTP server rather than double-clicking `index.html`.

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Refresh data locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/update_data.py
```

## Publish with GitHub Pages

See [DEPLOY.md](DEPLOY.md).

## Repository structure

```text
GEAR_Global_AI_Observatory/
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── countries.json
│   ├── sources.json
│   └── ingestion_status.json
├── scripts/
│   └── update_data.py
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATA_POLICY.md
├── .github/workflows/pages.yml
├── .nojekyll
├── requirements.txt
├── DEPLOY.md
├── LICENSE
└── README.md
```

## Satellite imagery

The globe uses NASA Earth Observatory Blue Marble imagery:
`https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png`

## Important limitations

This is a research prototype. Official statistics are often periodic, so “live” means GEAR automatically checks for the latest published official data. It does not imply second-by-second national statistics.

The scheduled workflow may need parser maintenance if an official website changes its HTML or wording.

## License

MIT. Source data and imagery retain their original publishers' terms and attribution requirements.
