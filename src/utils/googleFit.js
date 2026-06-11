/**
 * Google Fit API Sync Utility
 * Integrates client-side OAuth2 implicit flow with Google Fit REST endpoints.
 */

const ACTIVITY_MAP = {
  1: 'Biking',
  7: 'Cardio',
  8: 'Conditioning',
  9: 'Aerobic',
  11: 'Dancing',
  22: 'Gymnastics',
  24: 'Hiking',
  33: 'Martial Arts',
  55: 'Rowing',
  56: 'Running',
  72: 'Sleep',
  80: 'Squash',
  82: 'Surfing',
  83: 'Swimming',
  87: 'Tennis',
  93: 'Walking',
  97: 'Weightlifting',
  100: 'Yoga',
  114: 'Strength Training',
  116: 'CrossFit',
  117: 'HIIT',
  118: 'Pilates'
};

export const getActivityName = (code) => {
  return ACTIVITY_MAP[code] || 'Workout';
};

/**
 * Triggers Google OAuth Client-side Implicit Flow to obtain an Access Token.
 * @param {string} clientId - The Google Client ID configured in Settings.
 * @returns {Promise<string>} - Resolves with the access token.
 */
export const getGoogleFitAccessToken = (clientId) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      return reject(new Error("Google Client SDK not loaded. Check index.html or your network connection."));
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
        callback: (response) => {
          if (response.error) {
            reject(new Error(`OAuth error: ${response.error_description || response.error}`));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error("Authorization completed but no access token was returned."));
          }
        },
        error_callback: (err) => {
          reject(new Error(`OAuth flow error: ${err.message || 'Unknown configuration issue'}`));
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(new Error(`OAuth Initialization failed: ${err.message}`));
    }
  });
};

/**
 * Syncs Google Fit steps, calories, weight, sleep, and workouts for a specific date.
 * @param {string} accessToken - Google OAuth access token.
 * @param {string} dateStr - Target date string in YYYY-MM-DD format.
 * @returns {Promise<object>} - Synced metrics payload.
 */
export const fetchGoogleFitMetrics = async (accessToken, dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  const startTimeMillis = start.getTime();
  const endTimeMillis = end.getTime();

  let steps = 0;
  let activeCalories = 0;
  let sleepHours = 0;
  let weight = null;
  let workouts = [];

  // 1. Fetch steps and active calories via aggregate POST request
  try {
    const aggRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' }
        ],
        bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
        startTimeMillis: startTimeMillis,
        endTimeMillis: endTimeMillis
      })
    });

    if (aggRes.ok) {
      const aggData = await aggRes.json();
      if (aggData && aggData.bucket) {
        for (const bucket of aggData.bucket) {
          if (bucket.dataset) {
            for (const dataset of bucket.dataset) {
              const sourceId = dataset.dataSourceId || '';
              const isSteps = sourceId.includes("step_count");
              const isCals = sourceId.includes("calories");

              if (dataset.point) {
                for (const point of dataset.point) {
                  if (point.value) {
                    for (const val of point.value) {
                      const num = val.intVal !== undefined ? val.intVal : (val.fpVal !== undefined ? val.fpVal : 0);
                      if (isSteps) steps += num;
                      if (isCals) activeCalories += num;
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      console.warn("Aggregate API returned status: " + aggRes.status);
    }
  } catch (err) {
    console.error("Failed to fetch steps and calories from Google Fit:", err);
  }

  // 2. Fetch body weight raw points for the day
  try {
    const rawWeightRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.weight:com.google.android.gms:merge_weight/datasets/${startTimeMillis * 1000000}-${endTimeMillis * 1000000}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (rawWeightRes.ok) {
      const weightData = await rawWeightRes.json();
      if (weightData && weightData.point && weightData.point.length > 0) {
        const lastPoint = weightData.point[weightData.point.length - 1];
        if (lastPoint.value && lastPoint.value[0]) {
          const valObj = lastPoint.value[0];
          const rawWeightVal = valObj.fpVal !== undefined ? valObj.fpVal : (valObj.intVal !== undefined ? valObj.intVal : null);
          if (rawWeightVal) {
            weight = parseFloat(parseFloat(rawWeightVal).toFixed(1));
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch weight from standard merge weight datasource:", err);
  }

  // 3. Fetch Sessions (Sleep and Workouts)
  try {
    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${start.toISOString()}&endTime=${end.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      if (sessionsData && sessionsData.session) {
        for (const s of sessionsData.session) {
          const activityType = s.activityType;
          const sTime = parseInt(s.startTimeMillis);
          const eTime = parseInt(s.endTimeMillis);
          const durationHrs = (eTime - sTime) / (1000 * 60 * 60);

          if (activityType === 72) {
            // Sleep activity type
            sleepHours += durationHrs;
          } else if (activityType !== 3 && activityType !== 4) {
            // Active session (not sleep, still, or unknown sleep transitions)
            workouts.push({
              id: s.id || `googlefit-${sTime}`,
              name: s.name || getActivityName(activityType),
              activityType: activityType,
              startTimeMillis: sTime,
              endTimeMillis: eTime,
              durationMin: Math.round((eTime - sTime) / (1000 * 60)),
              caloriesBurned: 0
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch sessions from Google Fit:", err);
  }

  // 4. Resolve session-specific calories for workouts
  for (const w of workouts) {
    try {
      const wCalsRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
          startTimeMillis: w.startTimeMillis,
          endTimeMillis: w.endTimeMillis
        })
      });

      if (wCalsRes.ok) {
        const wCalsData = await wCalsRes.json();
        let sessionCals = 0;
        if (wCalsData && wCalsData.bucket) {
          for (const b of wCalsData.bucket) {
            if (b.dataset) {
              for (const ds of b.dataset) {
                if (ds.point) {
                  for (const pt of ds.point) {
                    if (pt.value) {
                      for (const val of pt.value) {
                        sessionCals += val.intVal !== undefined ? val.intVal : (val.fpVal !== undefined ? val.fpVal : 0);
                      }
                    }
                  }
                }
              }
            }
          }
        }
        w.caloriesBurned = Math.round(sessionCals);
      }
    } catch (err) {
      console.warn(`Could not resolve calories for workout session: ${w.name}`, err);
    }
  }

  return {
    steps: Math.round(steps),
    activeCalories: Math.round(activeCalories),
    sleepHours: parseFloat(sleepHours.toFixed(1)),
    weight,
    workouts
  };
};
