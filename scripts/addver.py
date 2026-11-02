import sys, re
ver, label, body_file = sys.argv[1], sys.argv[2], sys.argv[3]
row = f"| {ver} | {label} | [`release/{ver}`](https://github.com/auhbz/auhbon.com/tree/release/{ver}) |"
body = open(body_file).read().strip() + "\n\n---\n\n"
for p in ["CHANGELOG.md", "README.md"]:
    s = open(p).read()
    if row not in s:
        s = s.replace("|---|---|---|\n", "|---|---|---|\n" + row + "\n", 1)
    if p == "CHANGELOG.md" and f"## {ver}:" not in s:
        i = s.index("## ")
        s = s[:i] + body + s[i:]
    open(p, "w").write(s)
