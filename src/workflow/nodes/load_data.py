"""Example starting node for the sample workflow."""

def run(input_data=None):
    """Produce the initial payload for the workflow."""
    output = {
        "message": "seed: start",
        "step": 1,
    }
    return output
