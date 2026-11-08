"""Create an offline label/value chart, table, filters and CSV export."""
import argparse
import json
import math
from pathlib import Path

HTML = r"""<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Data explorer</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#20252b;--muted:#596575;--line:#d2d9df;--bar:#256b67}
@media(prefers-color-scheme:dark){:root{--bg:#15191d;--fg:#e7ecf0;--muted:#a7b1bc;--line:#3a434d;--bar:#72c6ba}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:960px;margin:auto;padding:32px 16px}h1{font-size:clamp(1.5rem,4vw,2.25rem);margin:0}
p{color:var(--muted);overflow-wrap:anywhere}.controls{display:flex;flex-wrap:wrap;gap:16px;margin:24px 0}
label{display:grid;gap:4px;flex:1;min-width:150px}input,select,button{font:inherit;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
:focus-visible{outline:3px solid var(--bar);outline-offset:3px}button{cursor:pointer;align-self:end}
.table{overflow-x:auto}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left}
td:first-child{overflow-wrap:anywhere}.number{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.plot-row{display:grid;grid-template-columns:minmax(80px,1fr) minmax(100px,3fr) minmax(60px,1fr);gap:12px;align-items:center;margin:10px 0}
.plot-label{overflow-wrap:anywhere}.track{height:22px;position:relative;background:color-mix(in srgb,var(--line) 30%,transparent)}
.bar{position:absolute;height:100%;background:var(--bar)}.zero{position:absolute;height:100%;border-left:1px solid var(--muted)}
#status{font-variant-numeric:tabular-nums}@media print{.controls{display:none}main{padding:0}.plot-row{break-inside:avoid}tr{break-inside:avoid}}
</style>
<main><h1 id="title"></h1><p id="source"></p>
<div class="controls"><label>Filter labels<input id="filter" type="search"></label>
<label>Sort<select id="sort"><option value="original">Source order</option><option value="high">Highest first</option><option value="low">Lowest first</option></select></label>
<button type="button" id="export">Download CSV</button></div>
<p id="status" role="status"></p><section id="plot" aria-label="Comparison chart"></section>
<div class="table"><table><thead><tr><th scope="col">Label</th><th class="number" scope="col" id="unit"></th></tr></thead><tbody id="rows"></tbody></table></div>
</main><script type="application/json" id="dataset">__DATA__</script>
<script>
"use strict";
const dataset=JSON.parse(document.getElementById("dataset").textContent);
const el=id=>document.getElementById(id);
el("title").textContent=dataset.title;
document.title=dataset.title;
el("source").textContent=dataset.source;
el("unit").textContent=dataset.unit || "Value";
let visible=[];
function element(tag,text,className){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function render(){
 const query=el("filter").value.toLocaleLowerCase();
 visible=dataset.rows.filter(row=>row.label.toLocaleLowerCase().includes(query));
 const order=el("sort").value;
 if(order!=="original")visible.sort((a,b)=>order==="high"?b.value-a.value:a.value-b.value);
 el("status").textContent=visible.length+" of "+dataset.rows.length+" rows";
 el("rows").replaceChildren();el("plot").replaceChildren();
 const low=visible.reduce((min,row)=>Math.min(min,row.value),0);
 const high=visible.reduce((max,row)=>Math.max(max,row.value),0);
 const span=high-low || 1;
 for(const row of visible){
  const value=new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(row.value);
  const tr=document.createElement("tr");tr.append(element("td",row.label),element("td",value,"number"));el("rows").append(tr);
  const container=element("div",undefined,"plot-row");
  const track=element("div",undefined,"track");track.setAttribute("aria-hidden","true");
  const zero=element("span",undefined,"zero");zero.style.left=(-low/span*100)+"%";
  const bar=element("span",undefined,"bar");bar.style.left=((Math.min(0,row.value)-low)/span*100)+"%";bar.style.width=(Math.abs(row.value)/span*100)+"%";
  track.append(zero,bar);container.append(element("span",row.label,"plot-label"),track,element("span",value,"number"));el("plot").append(container);
 }
 if(!visible.length)el("plot").append(element("p","No matching rows."));
}
el("filter").addEventListener("input",render);el("sort").addEventListener("change",render);
function csvCell(value){
 let text=String(value);
 if(/^[=+@\-\t\r]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
el("export").addEventListener("click",()=>{
 const lines=[["Label",dataset.unit||"Value"].map(csvCell).join(","),
 ...visible.map(row=>csvCell(row.label)+","+String(row.value))];
 const url=URL.createObjectURL(new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=url;link.download="filtered-data.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});render();
</script></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error("Output must differ from the source")
    data = json.loads(args.source.read_text(encoding="utf-8"))
    for key in ["title", "source", "unit"]:
        if not isinstance(data.get(key), str):
            parser.error(f"{key} must be a string")
    rows = data.get("rows")
    if not isinstance(rows, list) or len(rows) > 5000:
        parser.error("rows must be an array of at most 5000 items")
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("label"), str):
            parser.error("Each row needs a text label")
        value = row.get("value")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            parser.error("Each row needs a finite numeric value")
    encoded = json.dumps(data, ensure_ascii=True, allow_nan=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    result = HTML.replace("__DATA__", encoded)
    if len(result.encode("utf-8")) > 16_000_000:
        parser.error("Artifact exceeds 16 MB")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding="utf-8")
    print(json.dumps({"output": str(args.output), "rows": len(rows)}))


if __name__ == "__main__":
    main()
