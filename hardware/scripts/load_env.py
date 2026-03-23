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
env_values = parse_env_file(project_dir / ".env")

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
