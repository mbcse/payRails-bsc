const getCurrentMethodName = () => {
    const err = new Error();
    const stack = err.stack || err.stacktrace;
    const stackLines = stack.split('\n');
    // Adjust the index as needed to find the correct line
    // Line 2 usually contains the caller method in most environments
    const callerLine = stackLines[13];
    const match = callerLine.match(/at (\w+)/);
    return match ? match[1] : 'unknown';
  }




  function getFilePathFromStackTrace() {
    try {
        // Create a new error to generate the stack trace
        const err = new Error();
        const stack = err.stack || err.stacktrace;
        const stackLines = stack.split('\n');
        // Loop through stack lines to find the first one that likely contains a file path
        for (let i = 13; i < stackLines.length; i++) {
            let line = stackLines[i];
            
            // Adjust the regular expression to match file paths more broadly
            let match = line.match(/\((.*?):\d+:\d+\)$/) || // Matches most browsers format
                        line.match(/at (.*?):\d+:\d+/) || // Matches Node.js and some browsers
                        line.match(/@(.*?):\d+:\d+/); // Firefox without parentheses

            if (match && match[1]) {
                // Return the first matching file path
                return match[1];
            }
        }
    } catch (e) {
        console.error("Error extracting file path", e);
    }
    return 'unknown';
}

function getLineNumberFromStackTrace() {
  try {
      // Create a new error to generate the stack trace
      const err = new Error();
      const stack = err.stack || err.stacktrace;
      const stackLines = stack.split('\n');

      // Loop through stack lines to find the first one that likely contains a file path and line number
      for (let i = 13; i < stackLines.length; i++) {
          let line = stackLines[i];

          // Adjust the regular expression to match file paths and line numbers more broadly
          let match = line.match(/\((.*?):(\d+):\d+\)$/) || // Matches most browsers format
                      line.match(/at (.*?):(\d+):\d+/) || // Matches Node.js and some browsers
                      line.match(/@(.*?):(\d+):\d+/); // Firefox without parentheses

          if (match && match[1] && match[2]) {
              // Return the first matching file path and line number
                return match[2]
          }
      }
  } catch (e) {
      console.error("Error extracting file path and line number", e);
  }
}

module.exports = { getCurrentMethodName, getFilePathFromStackTrace,getLineNumberFromStackTrace }