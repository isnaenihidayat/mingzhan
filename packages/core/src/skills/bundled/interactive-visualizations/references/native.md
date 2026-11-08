# Native chat format

Use a fenced visual JSON block. Charts use inline data.values (up to 5000 rows), mark bar/line/area/point/circle/square/arc, and encoding x/y/color/theta/tooltip/xOffset. Encodings may specify field, type, title and supported aggregate. Do not use data.url, expressions, transform, layer, facet, repeat or params.

Example chart:
{"title":"Units","mark":"bar","data":{"values":[{"period":"Q3","units":120}]},"encoding":{"x":{"field":"period","type":"nominal"},"y":{"field":"units","type":"quantitative"},"tooltip":[{"field":"period"},{"field":"units"}]}}

Example composition:
{"title":"Results","rows":[{"stats":[{"label":"Rows","value":"2"}]},{"table":{"columns":["Period","Units"],"rows":[["Q3",120],["Q4",150]]}},{"text":"Illustrative values, not booking records."}]}

Native charts provide the supported tooltip behavior. Use HTML artifacts for custom filters, editable scenarios, CSV export and richer interactions. Do not claim a native chart supports a control unless the renderer actually implements it.
