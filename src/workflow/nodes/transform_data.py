"""Transform the payload emitted by ``load_data``."""

def run(input_data):
    """Append processing metadata to the incoming payload."""
    if input_data is None:
        input_data = {}

    message = input_data.get("message", "")
    if message:
        message = f"{message} -> transformed"
    else:
        message = "transformed"

    enriched = {
        **input_data,
        "message": message,
        "step": input_data.get("step", 0) + 1,
    }
    return enriched
