export function updateEstimatedDuration() {
    const text = document.getElementById('textInput').value.trim();
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const WPM = 160; // Average speaking rate
    const seconds = Math.ceil((words / WPM) * 60);

    const durationFormatted = formatDuration(seconds);
    document.getElementById('durationEstimate').textContent =
      `Estimated Duration (WPM): ${durationFormatted}s`;
  }

  export function formatDuration(seconds) {
    const sec = Math.floor(seconds % 60);
    const min = Math.floor((seconds / 60) % 60);
    const hrs = Math.floor(seconds / 3600);

    const padded = (n) => n.toString().padStart(2, '0');

    if (hrs > 0) {
        return `${hrs}:${padded(min)}:${padded(sec)}`;
    } else if (min > 0) {
        return `${min}:${padded(sec)}`;
    } else {
        return `${seconds.toFixed(1)} seconds`;
    }
  }

