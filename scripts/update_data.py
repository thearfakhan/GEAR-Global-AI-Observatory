#!/usr/bin/env python3
"""Conservative updater for GEAR.

It checks only allowlisted official URLs. Parsers update a small set of explicitly
recognized facts. If a parser cannot prove a value from the source text, the
existing value is retained. The script never trains or deploys a model.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re, sys
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
UA='GEAR-Research-Bot/0.1 (+https://github.com/)'

def load(name): return json.loads((DATA/name).read_text(encoding='utf-8'))
def save(name,obj): (DATA/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n",encoding='utf-8')
def clean(html): return ' '.join(BeautifulSoup(html,'html.parser').stripped_strings)
def num(s): return s.replace(',','').replace('，','')

def parse_us(text,c):
    m=re.search(r'(?:more than\s+)?([\d,]+) research projects and ([\d,]+) students',text,re.I)
    if m:
        c['United States']['research']['value']=f"{int(num(m.group(1))):,}+ projects"
        c['United States']['research']['note']=f"NSF reports more than {int(num(m.group(1))):,} research projects and {int(num(m.group(2))):,} students supported."

def parse_cn(text,c):
    m=re.search(r'智能算力规模达\s*([\d.]+)\s*EFLOPS',text,re.I)
    f=re.search(r'万卡以上智算设施\s*([\d]+)\s*个',text)
    if m: c['China']['compute']['value']=f"{m.group(1)} EFLOPS"
    if f: c['China']['chips']['value']=f"{f.group(1)} large facilities"

def parse_uk(text,c):
    m=re.search(r'from\s+([\d.]+)\s+AI.*?ExaFLOPS\s+in\s+2025\s+to\s+([\d.]+)\s+AI.*?ExaFLOPS\s+by\s+2030',text,re.I)
    inv=re.search(r'committed up to £([\d.]+) billion',text,re.I)
    if m:
        c['United Kingdom']['compute']['value']=f"{m.group(1)} AI ExaFLOPS"
        c['United Kingdom']['programs']['value']=f"{m.group(2)} AI ExaFLOPS"
    if inv: c['United Kingdom']['investment']['value']=f"Up to £{inv.group(1)}B"

def parse_india(text,c):
    g=re.search(r'more than\s+([\d]+)\s+thousand GPUs',text,re.I)
    out=re.search(r'outlay of (?:Rs\.?|₹)\s*([\d,]+)\s*(?:crore|Cr)',text,re.I)
    if g: c['India']['compute']['value']=f"{int(g.group(1))*1000:,}+ GPUs"
    if out: c['India']['investment']['value']=f"₹{out.group(1)} crore"

def parse_india_foundation(text,c):
    m=re.search(r'(Twelve|12) Teams have been Shortlisted',text,re.I)
    if m: c['India']['research']['value']='12 teams'

def parse_canada(text,c):
    total=re.search(r'allocating \$([\d.]+)\s*billion',text,re.I)
    superc=re.search(r'Up to \$([\d.]+)\s*million for a new AI supercomputing system',text,re.I)
    access=re.search(r'up to \$([\d.]+)\s*million.*?AI Compute Access Fund',text,re.I|re.S)
    if total: c['Canada']['investment']['value']=f"C${total.group(1)}B"
    if superc: c['Canada']['compute']['value']=f"Up to C${superc.group(1)}M"
    if access: c['Canada']['programs']['value']=f"Up to C${access.group(1)}M"

def parse_japan(text,c):
    m=re.search(r'(?:the\s+)?([\d]+) projects selected',text,re.I)
    if m:
        c['Japan']['compute']['value']=f"{m.group(1)} projects"
        c['Japan']['programs']['value']=f"{m.group(1)} projects"

PARSERS={'us_nairr':parse_us,'cn_miit':parse_cn,'uk_compute':parse_uk,'in_indiaai':parse_india,'in_foundation':parse_india_foundation,'ca_compute':parse_canada,'jp_geniac':parse_japan}

def main():
    countries=load('countries.json'); sources=load('sources.json'); results=[]
    for s in sources:
        if not s.get('parser'): continue
        item={'id':s['id'],'url':s['url'],'checked_at':datetime.now(timezone.utc).isoformat(),'ok':False}
        try:
            r=requests.get(s['url'],headers={'User-Agent':UA},timeout=30)
            r.raise_for_status(); text=clean(r.text); item['sha256']=hashlib.sha256(r.content).hexdigest(); item['http_status']=r.status_code
            parser=PARSERS.get(s['parser']);
            if parser: parser(text,countries)
            item['ok']=True
        except Exception as e:
            item['error']=str(e)[:300]
        results.append(item)
    save('countries.json',countries); save('ingestion_status.json',{'last_run':datetime.now(timezone.utc).isoformat(),'sources':results})
    ok=sum(1 for r in results if r['ok']); print(f'Checked {len(results)} sources; {ok} succeeded.')
    return 0
if __name__=='__main__': raise SystemExit(main())
