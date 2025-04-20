# Go Stock Data Fetcher

This application fetches and displays recent stock data for a predefined symbol (currently IBM) using the Alpha Vantage API.

## Prerequisites

- Go (version 1.18 or later recommended)
- An Alpha Vantage API Key

## Setup

1.  **Get API Key:**
    *   Sign up for a free API key at [Alpha Vantage](https://www.alphavantage.co/support/#api-key).

2.  **Set Environment Variable:**
    *   Set the `ALPHA_VANTAGE_API_KEY` environment variable to your obtained key.
    *   **Linux/macOS:**
        ```bash
        export ALPHA_VANTAGE_API_KEY='YOUR_API_KEY'
        ```
    *   **Windows (Command Prompt):**
        ```cmd
        set ALPHA_VANTAGE_API_KEY=YOUR_API_KEY
        ```
    *   **Windows (PowerShell):**
        ```powershell
        $env:ALPHA_VANTAGE_API_KEY='YOUR_API_KEY'
        ```
    *   Replace `YOUR_API_KEY` with the actual key. You might want to add this export command to your shell's profile file (like `.bashrc`, `.zshrc`, or PowerShell profile) for persistence.

## Running the Application

1.  Navigate to the `goapp` directory in your terminal:
    ```bash
    cd path/to/example-projects/goapp
    ```
2.  Run the application:
    ```bash
    go run main.go
    ```

The application will fetch the latest 5-minute interval data for the symbol defined in `main.go` (default: IBM) and print the symbol, last refresh time, and the latest closing price to the console.

## Note

- The free tier of Alpha Vantage has usage limits (e.g., 5 requests per minute, 500 per day). If you encounter issues, check if you've hit these limits.
- The application currently uses a hardcoded symbol ("IBM") and interval ("5min"). You can modify these constants in `main.go` if needed.
