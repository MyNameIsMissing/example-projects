import os
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SETUP_SCRIPT = PROJECT_ROOT / "setup.sh"
LAUNCHER = PROJECT_ROOT / "srg"
COMMON_SCRIPT = PROJECT_ROOT / "scripts" / "common.sh"


def run_bash(*args: str, cwd: Path | None = None, env: dict | None = None):
    return subprocess.run(
        ["bash", *args],
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def test_setup_help_works_outside_project_directory(tmp_path):
    result = run_bash(str(SETUP_SCRIPT), "--help", cwd=tmp_path)

    assert result.returncode == 0
    assert "--check" in result.stdout
    assert "--install-dir DIR" in result.stdout


def test_setup_rejects_unknown_option_without_making_changes(tmp_path):
    env = {**os.environ, "HOME": str(tmp_path)}
    result = run_bash(str(SETUP_SCRIPT), "--not-an-option", cwd=tmp_path, env=env)

    assert result.returncode == 2
    assert "Unknown option: --not-an-option" in result.stderr
    assert not (tmp_path / ".local").exists()


def test_shell_scripts_have_valid_bash_syntax():
    result = run_bash("-n", str(SETUP_SCRIPT), str(LAUNCHER), str(COMMON_SCRIPT))

    assert result.returncode == 0, result.stderr


def test_model_detection_matches_exact_model_names(tmp_path):
    fake_ollama = tmp_path / "ollama"
    fake_ollama.write_text(
        "#!/usr/bin/env bash\n"
        "printf 'NAME ID SIZE MODIFIED\\n'\n"
        "printf 'llama3.1:8b abc 1GB now\\n'\n"
        "printf 'embeddinggemma:latest def 1GB now\\n'\n",
        encoding="utf-8",
    )
    fake_ollama.chmod(0o755)
    env = {**os.environ, "PATH": f"{tmp_path}:{os.environ['PATH']}"}
    command = (
        f"source {COMMON_SCRIPT!s}; "
        "srg_model_installed llama3.1:8b; "
        "srg_model_installed embeddinggemma; "
        "! srg_model_installed llama3X1:8b"
    )

    result = run_bash("-c", command, env=env)

    assert result.returncode == 0, result.stderr


def test_launcher_resolves_project_when_invoked_through_symlink(tmp_path):
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    (fake_bin / "srg").symlink_to(LAUNCHER)
    fake_ollama = fake_bin / "ollama"
    fake_ollama.write_text(
        '#!/usr/bin/env bash\nif [ "${1:-}" = "list" ]; then exit 0; fi\nexit 1\n',
        encoding="utf-8",
    )
    fake_ollama.chmod(0o755)
    env = {**os.environ, "PATH": f"{fake_bin}:{os.environ['PATH']}"}

    result = subprocess.run(
        [str(fake_bin / "srg"), "--help"],
        cwd=tmp_path,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "Local RAG CLI for drafting security control responses" in result.stdout
