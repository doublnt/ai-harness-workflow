import os

# RISK: trust-boundary — no path.abspath + allowed-root check before open()
def read_user_file(path: str) -> str:
    # A caller supplying "../../etc/passwd" reads any file the process can access
    with open(path, "r") as f:
        return f.read()

def write_user_file(path: str, content: str) -> None:
    with open(path, "w") as f:
        f.write(content)
