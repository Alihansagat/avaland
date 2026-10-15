P = []


def prob(**kw):
    kw.setdefault("compare", "exact")
    kw.setdefault("edge", [])
    P.append(kw)


def camel(name):
    head, *rest = name.split("_")
    return head + "".join(w.title() for w in rest)
