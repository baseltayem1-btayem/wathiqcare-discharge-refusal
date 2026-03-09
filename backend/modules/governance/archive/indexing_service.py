def index_document(metadata: dict) -> dict:
    indexed = dict(metadata)
    indexed["archive_status"] = "INDEXED"
    indexed["indexing_mode"] = "internal-safe"
    return indexed
