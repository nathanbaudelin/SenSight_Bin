from pathlib import Path

Import("env")


def parse_env_file(env_path: Path):
    values = {}
    if not env_path.exists():
        return values

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def escape_cpp_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


project_dir = Path(env["PROJECT_DIR"])
workspace_root = project_dir.parent

candidate_env_files = [
    project_dir / ".env",          # hardware/.env
    workspace_root / ".env",       # repo-root .env
    project_dir / ".env.local",    # optional hardware override
]

env_values = {}
loaded_files = []
for env_file in candidate_env_files:
    if not env_file.exists():
        continue
    env_values.update(parse_env_file(env_file))
    loaded_files.append(str(env_file))

string_keys = [
    "SMARTBIN_WIFI_SSID",
    "SMARTBIN_WIFI_PASSWORD",
    "SMARTBIN_BACKEND_URL",
    "SMARTBIN_BIN_ID",
]

numeric_keys = [
    "SMARTBIN_BIN_DEPTH_CM",
    "SMARTBIN_SLEEP_SECONDS",
]

cpp_defines = []

for key in string_keys:
    if key in env_values:
        cpp_defines.append((key, f'\\"{escape_cpp_string(env_values[key])}\\"'))

for key in numeric_keys:
    if key in env_values and env_values[key]:
        cpp_defines.append((key, env_values[key]))

if cpp_defines:
    env.Append(CPPDEFINES=cpp_defines)

print("[load_env] Loaded env files:")
if loaded_files:
    for path in loaded_files:
        print(f"[load_env] - {path}")
else:
    print("[load_env] - none")

if cpp_defines:
    print("[load_env] Injected SMARTBIN defines:")
    for define in cpp_defines:
        print(f"[load_env] - {define[0]}")
else:
    print("[load_env] No SMARTBIN_* values found in env files.")
    print("[load_env] Expected keys: SMARTBIN_WIFI_SSID, SMARTBIN_WIFI_PASSWORD, SMARTBIN_BACKEND_URL")
