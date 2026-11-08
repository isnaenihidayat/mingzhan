"""Profile CSV/XLSX sources and compute explicit numeric summaries and weighted rates."""
import argparse
import hashlib
import json
from pathlib import Path
import pandas as pd


def describe(frame, numeric, group_by, numerator, denominator):
    report = {
        "rows": len(frame), "columns": list(frame.columns),
        "duplicate_rows": int(frame.duplicated().sum()),
        "missing": {str(key): int(value) for key, value in frame.isna().sum().items()},
        "numeric": {}, "warnings": [],
    }
    measured = list(dict.fromkeys(numeric + [x for x in [numerator, denominator] if x]))
    for column in measured:
        if column not in frame:
            raise ValueError(f"Missing column: {column}")
        raw = frame[column]
        converted = pd.to_numeric(raw, errors="coerce").replace([float("inf"), -float("inf")], float("nan"))
        invalid = int((raw.notna() & converted.isna()).sum())
        if invalid:
            report["warnings"].append(f"{column}: {invalid} invalid numeric values")
        report["numeric"][column] = {
            "valid": int(converted.count()), "invalid": invalid,
            "sum": float(converted.sum()) if converted.count() else None,
            "mean": float(converted.mean()) if converted.count() else None,
            "min": float(converted.min()) if converted.count() else None,
            "max": float(converted.max()) if converted.count() else None,
        }
        frame = frame.assign(**{column: converted})
    if group_by and group_by not in frame:
        raise ValueError(f"Missing group column: {group_by}")
    if numerator and denominator:
        def rate(rows):
            valid = rows[numerator].notna() & rows[denominator].notna() & (rows[denominator] > 0)
            selected = rows.loc[valid]
            total = float(selected[denominator].sum())
            amount = float(selected[numerator].sum())
            return {
                "numerator": amount, "denominator": total,
                "rate": amount / total if total > 0 else None,
                "included_rows": int(valid.sum()), "excluded_rows": int((~valid).sum()),
            }
        report["rate"] = rate(frame)
        if group_by:
            report["groups"] = [
                {"label": None if pd.isna(key) else str(key), **rate(rows)}
                for key, rows in frame.groupby(group_by, dropna=False, sort=True)
            ]
    elif group_by:
        report["groups"] = [
            {"label": None if pd.isna(key) else str(key), "rows": len(rows)}
            for key, rows in frame.groupby(group_by, dropna=False, sort=True)
        ]
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--numeric", nargs="*", default=[])
    parser.add_argument("--group-by")
    parser.add_argument("--numerator")
    parser.add_argument("--denominator")
    parser.add_argument("--sheet", default=0)
    parser.add_argument("--encoding", default="utf-8-sig")
    args = parser.parse_args()
    if bool(args.numerator) != bool(args.denominator):
        parser.error("Specify both --numerator and --denominator")
    source = args.source.resolve(strict=True)
    if args.output.resolve() == source:
        parser.error("Output must differ from the source")
    if source.suffix.lower() == ".csv":
        frame = pd.read_csv(source, dtype="string", encoding=args.encoding, keep_default_na=False).replace("", pd.NA)
    elif source.suffix.lower() == ".xlsx":
        frame = pd.read_excel(source, sheet_name=args.sheet, dtype="string", keep_default_na=False).replace("", pd.NA)
    else:
        parser.error("Supported sources: CSV and XLSX")
    result = describe(frame, args.numeric, args.group_by, args.numerator, args.denominator)
    result["source"] = source.name
    result["sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "rows": len(frame), "warnings": result["warnings"]}))


if __name__ == "__main__":
    main()
