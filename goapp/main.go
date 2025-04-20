package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// Define structs to match the Alpha Vantage JSON structure
// Note: This structure might need adjustment based on the specific endpoint and data format.
// We are using TIME_SERIES_INTRADAY as an example.
type MetaData struct {
	Information   string `json:"1. Information"`
	Symbol        string `json:"2. Symbol"`
	LastRefreshed string `json:"3. Last Refreshed"`
	Interval      string `json:"4. Interval"`
	OutputSize    string `json:"5. Output Size"`
	TimeZone      string `json:"6. Time Zone"`
}

type TimeSeriesEntry struct {
	Open   string `json:"1. open"`
	High   string `json:"2. high"`
	Low    string `json:"3. low"`
	Close  string `json:"4. close"`
	Volume string `json:"5. volume"`
}

type AlphaVantageResponse struct {
	MetaData      MetaData                   `json:"Meta Data"`
	TimeSeries5min map[string]TimeSeriesEntry `json:"Time Series (5min)"` // Key is timestamp string
}

const (
	alphaVantageURL = "https://www.alphavantage.co/query"
	function        = "TIME_SERIES_INTRADAY"
	symbol          = "IBM" // Default symbol
	interval        = "5min"
)

func main() {
	apiKey := os.Getenv("ALPHA_VANTAGE_API_KEY")
	if apiKey == "" {
		// Use a placeholder if the env var is not set
		apiKey = "YOUR_API_KEY_HERE" // Replace with your actual key or keep as placeholder
		log.Println("Warning: ALPHA_VANTAGE_API_KEY environment variable not set. Using placeholder.")
	}

	// Construct the API URL
	// Example URL: https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=YOUR_API_KEY_HERE
	requestURL := fmt.Sprintf("%s?function=%s&symbol=%s&interval=%s&apikey=%s",
		alphaVantageURL, function, symbol, interval, apiKey)

	log.Printf("Fetching data from: %s\n", alphaVantageURL) // Log base URL, not the full one with key

	// Make the HTTP GET request
	resp, err := http.Get(requestURL)
	if err != nil {
		log.Fatalf("Error fetching data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Fatalf("API request failed with status %s: %s", resp.Status, string(bodyBytes))
	}

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	// Parse the JSON response
	var apiResponse AlphaVantageResponse
	err = json.Unmarshal(body, &apiResponse)
	if err != nil {
		// Log the body for debugging if JSON parsing fails
		log.Printf("Raw response body:\n%s\n", string(body))
		log.Fatalf("Error parsing JSON response: %v", err)
	}

	// Print some information
	fmt.Printf("Stock Data for: %s\n", apiResponse.MetaData.Symbol)
	fmt.Printf("Last Refreshed: %s\n", apiResponse.MetaData.LastRefreshed)

	// Find the latest entry (map iteration order is not guaranteed, so find the latest timestamp)
	var latestTime time.Time
	var latestEntry TimeSeriesEntry
	first := true

	for timestampStr, entry := range apiResponse.TimeSeries5min {
		// Example timestamp format from Alpha Vantage: "2023-10-27 19:55:00"
		layout := "2006-01-02 15:04:05"
		loc, _ := time.LoadLocation(apiResponse.MetaData.TimeZone) // Use timezone from metadata
		currentTime, err := time.ParseInLocation(layout, timestampStr, loc)
		if err != nil {
			log.Printf("Warning: Could not parse timestamp '%s': %v", timestampStr, err)
			continue // Skip if timestamp parsing fails
		}

		if first || currentTime.After(latestTime) {
			latestTime = currentTime
			latestEntry = entry
			first = false
		}
	}

	if !first { // Check if we found at least one entry
		fmt.Printf("Latest Price (%s): %s\n", latestTime.Format(time.RFC3339), latestEntry.Close)
	} else {
		fmt.Println("No time series data found in the response.")
		// This might happen if the API returns an error message within a 200 OK response,
		// e.g., due to an invalid API key or hitting rate limits.
		log.Printf("Raw response body for inspection:\n%s\n", string(body))
	}
}
