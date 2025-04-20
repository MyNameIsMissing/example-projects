package main

import (
	"encoding/json"
	"testing"
	"time"
)

// Sample JSON data mimicking the Alpha Vantage TIME_SERIES_INTRADAY response
const sampleJsonResponse = `
{
    "Meta Data": {
        "1. Information": "Intraday (5min) open, high, low, close prices and volume",
        "2. Symbol": "TEST",
        "3. Last Refreshed": "2025-04-20 11:20:00",
        "4. Interval": "5min",
        "5. Output Size": "Compact",
        "6. Time Zone": "US/Eastern"
    },
    "Time Series (5min)": {
        "2025-04-20 11:20:00": {
            "1. open": "150.00",
            "2. high": "150.50",
            "3. low": "149.80",
            "4. close": "150.25",
            "5. volume": "10000"
        },
        "2025-04-20 11:15:00": {
            "1. open": "149.80",
            "2. high": "150.10",
            "3. low": "149.70",
            "4. close": "150.00",
            "5. volume": "8500"
        }
    }
}
`

func TestParseAlphaVantageResponse(t *testing.T) {
	var response AlphaVantageResponse
	err := json.Unmarshal([]byte(sampleJsonResponse), &response)

	// Test 1: Check if unmarshalling was successful
	if err != nil {
		t.Fatalf("Failed to unmarshal sample JSON: %v", err)
	}

	// Test 2: Check Meta Data fields
	expectedSymbol := "TEST"
	if response.MetaData.Symbol != expectedSymbol {
		t.Errorf("Expected MetaData Symbol to be %s, but got %s", expectedSymbol, response.MetaData.Symbol)
	}

	expectedTimeZone := "US/Eastern"
	if response.MetaData.TimeZone != expectedTimeZone {
		t.Errorf("Expected MetaData Time Zone to be %s, but got %s", expectedTimeZone, response.MetaData.TimeZone)
	}

	// Test 3: Check if Time Series data exists and has the correct number of entries
	expectedEntries := 2
	if len(response.TimeSeries5min) != expectedEntries {
		t.Errorf("Expected %d time series entries, but got %d", expectedEntries, len(response.TimeSeries5min))
	}

	// Test 4: Check specific values in a time series entry
	timestampKey := "2025-04-20 11:20:00"
	entry, ok := response.TimeSeries5min[timestampKey]
	if !ok {
		t.Fatalf("Expected time series entry for key %s not found", timestampKey)
	}

	expectedClose := "150.25"
	if entry.Close != expectedClose {
		t.Errorf("Expected close price for %s to be %s, but got %s", timestampKey, expectedClose, entry.Close)
	}

	expectedVolume := "10000"
	if entry.Volume != expectedVolume {
		t.Errorf("Expected volume for %s to be %s, but got %s", timestampKey, expectedVolume, entry.Volume)
	}
}

// Helper function to find the latest entry (copied and adapted from main.go for potential future tests)
// Not directly tested by TestParseAlphaVantageResponse but could be used in other tests.
func findLatestEntry(response AlphaVantageResponse) (time.Time, TimeSeriesEntry, bool) {
	var latestTime time.Time
	var latestEntry TimeSeriesEntry
	first := true
	found := false

	layout := "2006-01-02 15:04:05" // Matching the sample data format
	loc, err := time.LoadLocation(response.MetaData.TimeZone)
	if err != nil {
		// Handle error loading location, perhaps default to UTC or log
		loc = time.UTC // Fallback
	}


	for timestampStr, entry := range response.TimeSeries5min {
		currentTime, err := time.ParseInLocation(layout, timestampStr, loc)
		if err != nil {
			continue // Skip if timestamp parsing fails
		}

		if first || currentTime.After(latestTime) {
			latestTime = currentTime
			latestEntry = entry
			first = false
			found = true
		}
	}
	return latestTime, latestEntry, found
}

// Example of testing the findLatestEntry logic (Optional additional test)
func TestFindLatestEntry(t *testing.T) {
	var response AlphaVantageResponse
	err := json.Unmarshal([]byte(sampleJsonResponse), &response)
	if err != nil {
		t.Fatalf("Setup failed: Could not unmarshal sample JSON for TestFindLatestEntry: %v", err)
	}

	latestTime, latestEntry, found := findLatestEntry(response)

	if !found {
		t.Fatal("Expected to find a latest entry, but none was found.")
	}

	expectedTimestampStr := "2025-04-20 11:20:00"
	expectedClose := "150.25"

	layout := "2006-01-02 15:04:05"
	loc, _ := time.LoadLocation("US/Eastern") // Use timezone from sample
	expectedTime, _ := time.ParseInLocation(layout, expectedTimestampStr, loc)


	if !latestTime.Equal(expectedTime) {
		t.Errorf("Expected latest time to be %s, but got %s", expectedTime, latestTime)
	}

	if latestEntry.Close != expectedClose {
		t.Errorf("Expected latest entry close price to be %s, but got %s", expectedClose, latestEntry.Close)
	}
}
