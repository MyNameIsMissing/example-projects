from security_response_generator.ingest.loaders import iter_source_files, load_document


def test_iter_source_files_excludes_readme_and_gitkeep(tmp_path):
    (tmp_path / "README.md").write_text("placeholder")
    (tmp_path / ".gitkeep").write_text("")
    (tmp_path / "control.md").write_text("real content")

    found = list(iter_source_files(tmp_path))

    assert [p.name for p in found] == ["control.md"]


def test_iter_source_files_filters_unsupported_extensions(tmp_path):
    (tmp_path / "notes.txt").write_text("text")
    (tmp_path / "image.png").write_bytes(b"\x89PNG")

    found = list(iter_source_files(tmp_path))

    assert [p.name for p in found] == ["notes.txt"]


def test_iter_source_files_missing_directory_yields_nothing(tmp_path):
    assert list(iter_source_files(tmp_path / "does_not_exist")) == []


def test_load_document_reads_markdown_with_relative_path(tmp_path):
    (tmp_path / "sub").mkdir()
    file_path = tmp_path / "sub" / "control.md"
    file_path.write_text("SI-5 content")

    document = load_document(file_path, tmp_path)

    assert document.source_path == "sub/control.md"
    assert document.text == "SI-5 content"
