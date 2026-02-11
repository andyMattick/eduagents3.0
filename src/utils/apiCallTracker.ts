/**
 * API Call Tracker - Shows alerts and logs when API calls are made
 */

export interface APICall {
  service: string;
  method: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  error?: string;
  duration?: number;
}

let apiCalls: APICall[] = [];

export function trackAPICall(
  service: string,
  method: string,
  callback: () => Promise<any>
): Promise<any> {
  const call: APICall = {
    service,
    method,
    timestamp: new Date(),
    status: 'pending',
  };

  const startTime = Date.now();

  // Show alert that API call is starting
  console.log(`🔌 API CALL: ${service}.${method}()`);
  if (typeof window !== 'undefined' && window.alert) {
    // Don't block the app with alert - just log to console instead
    console.log(`📡 Making API request to ${service}...`);
  }

  return callback()
    .then((result) => {
      call.status = 'success';
      call.duration = Date.now() - startTime;
      apiCalls.push(call);

      console.log(`✅ API CALL COMPLETE: ${service}.${method}() (${call.duration}ms)`);

      return result;
    })
    .catch((error) => {
      call.status = 'error';
      call.error = error.message;
      call.duration = Date.now() - startTime;
      apiCalls.push(call);

      console.error(`❌ API CALL FAILED: ${service}.${method}() - ${error.message}`);

      throw error;
    });
}

export function getAPICallHistory(): APICall[] {
  return [...apiCalls];
}

export function clearAPICallHistory(): void {
  apiCalls = [];
}

export function logAPICall(call: APICall): void {
  console.log(
    `[${call.timestamp.toLocaleTimeString()}] ${call.service}.${call.method}() - ${call.status}${call.duration ? ` (${call.duration}ms)` : ''}`
  );
}
