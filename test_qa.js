const API_URL = 'http://localhost:3000/api/telemetry';

const testCases = [
  {
    name: 'Valid Normal Payload',
    expectedStatus: 200,
    payload: {
      worker_id: 'EMP-042',
      timestamp: Date.now() / 1000,
      heart_rate: 80,
      spo2: 98,
      eda: 750,
      motion_g: 1.05
    }
  },
  {
    name: 'Missing Timestamp (Schema Failure)',
    expectedStatus: 400,
    payload: {
      worker_id: 'EMP-042',
      heart_rate: 80,
      spo2: 98,
      eda: 750,
      motion_g: 1.05
    }
  },
  {
    name: 'Out-of-Range Heart Rate (>220 BPM)',
    expectedStatus: 400,
    payload: {
      worker_id: 'EMP-042',
      timestamp: Date.now() / 1000,
      heart_rate: 250,
      spo2: 98,
      eda: 750,
      motion_g: 1.05
    }
  },
  {
    name: 'Valid Fall Impact Event Trigger',
    expectedStatus: 200,
    payload: {
      worker_id: 'EMP-042',
      timestamp: Date.now() / 1000,
      heart_rate: 125,
      spo2: 96,
      eda: 1300,
      motion_g: 4.2
    }
  }
];

async function runQATests() {
  console.log('--- Starting Automated QA Validation Tests ---\n');
  let passed = 0;

  for (const tc of testCases) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tc.payload)
      });

      const body = await response.json();
      const statusMatch = response.status === tc.expectedStatus;

      if (statusMatch) {
        console.log(`✅ [PASS] ${tc.name} | Status: ${response.status}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${tc.name} | Expected: ${tc.expectedStatus}, Got: ${response.status}`);
        console.error(`   Response:`, body);
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${tc.name} failed to reach server: ${err.message}`);
    }
  }

  console.log(`\nQA Test Results: ${passed}/${testCases.length} Passed.`);
}

runQATests();
