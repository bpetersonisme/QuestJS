"use strict";

// This is not language neutral, but should not be shipping with the game, so tough

// Note that the test object was defined in util.js

test.resetOnCompletion = true
test.saveFilename = 'unit-test-save-file'

test.runTests = function() {
  test.testOutput = []
  test.totalCount = 0
  test.failCount = 0
  test.subCount = 0
  test.currentTitle = "Not specified"
  localStorage.setItem(saveLoad.getName(test.saveFilename), saveLoad.saveTheWorld('Start point saved for unit testing'))
  const time = parseInt(Date.now())
  test.tests()
  test.results (time)
  if (this.resetOnCompletion) test.start("All done")
  localStorage.removeItem(saveLoad.getName(test.saveFilename))
  if (test.onFinish) test.onFinish(test.failCount === 0)
  io.updateUIItems()
}

test.start = function(title, filename = test.saveFilename) {
  this.title(title)
  const s = localStorage.getItem(saveLoad.getName(filename));
  if (s != null) {
    saveLoad.loadTheWorld(s, 4)
    if (settings.afterLoad) settings.afterLoad(filename)
  }
  else {
    metamsg("Load failed: File not found: " + filename);
  }
}

test.title = function(title) {
  test.subCount = 0
  test.currentTitle = title
  if (test.printTitles) log(title)
}

test.printTitle = function() {
  debugmsg(test.currentTitle + ": Error (test " + test.subCount + ")")
  test.failCount++
}

test.assertCmd = function(cmdStr, expected, extraOutput) {
  test.assertOut(expected, function() {
    parser.parse(cmdStr)
  }, extraOutput)
}

test.function = function(f) {
  test.testing = true
  test.testOutput = []
  f()
  test.testing = false
  return test.testOutput
}

test.assertOut = function(expected, f, extraOutput) {
  test.totalCount++
  test.subCount++
  if (!Array.isArray(expected)) {
    expected = [expected]
  }
  test.testing = true
  test.testOutput = []
  f()
  test.testing = false
  
  if (test.testOutput.length === expected.length && test.testOutput.every(function(value, index) {
    if (typeof expected[index] === "string") {
      return value === expected[index]
    }
    else {
      return expected[index].test(value)
    }
  })) {
    //debugmsg(".")
  }
  else {
    test.printTitle();
    for (let i = 0; i < Math.max(test.testOutput.length, expected.length); i++) {
      if (typeof expected[i] === "string") {
        if (expected[i] !== test.testOutput[i]) {
          debugmsg("Expected (A): " + expected[i])
          debugmsg("...Found (A): " + test.testOutput[i])
          debugmsg(" ")
          if (extraOutput) {
            if (typeof expected[i] === "string" && typeof test.testOutput[i] === "string") {
              for (let j = 0; j < expected[i].length; j++) {
                if (expected[i][j] !== test.testOutput[i][j]) {
                  console.log("Mismatch at position: " + j)
                  console.log("Expected: " + expected[i].charCodeAt(j))
                  console.log("Found: " + test.testOutput[i].charCodeAt(j))
                }
              }
            }
            else {
              console.log("Found: type mismatch")
              console.log(typeof expected[i])
              console.log(typeof test.testOutput[i])
            }
          }
        }
      }
      else if (expected[i] instanceof RegExp) {
        if (test.testOutput[i] === undefined || !expected[i].test(test.testOutput[i])) {
          debugmsg("Expected: " + expected[i])
          debugmsg("...Found: " + test.testOutput[i])
          debugmsg(" ")
        }
      }
      else if (expected[i] === undefined) {
        debugmsg("Expected nothing")
        debugmsg("...Found: " + test.testOutput[i])
        debugmsg(" ")
      }
      else {
        debugmsg("Found an unrecognised type for expected (should be string or regex): " + (typeof expected[i]))
        debugmsg(" ")
      }
    }
  }
}


test.assertEqual = function(expected, found, extraOutput) {
  if (expected instanceof RegExp) return assertMatch(expected, found)

  test.totalCount++
  test.subCount++
  
  if (Array.isArray(expected)) {
    if (!array.compare(expected, found)) {
      test.printTitle()
      debugmsg("Expected (A): " + expected)
      debugmsg("...Found (A): " + found)
      debugmsg(" ")
    }
  }
  else if (expected === found) {
    //debugmsg(".")
  }
  else {
    test.printTitle()
    debugmsg("Expected: " + expected)
    debugmsg("...Found: " + found)
    debugmsg(" ")
    if (extraOutput) {
      if (typeof expected === "string" && typeof found === "string") {
        for (let i = 0; i < expected.length; i++) {
          if (expected[i] !== found[i]) {
            console.log("Mismatch at position: " + i)
            console.log("Expected: " + expected.charCodeAt(i))
            console.log("Found: " + found.charCodeAt(i))
          }
        }
      }
    }
  }
}

// Use only for numbers; expected must not be zero, as long as the found is within 0.1% of the expected, this is pass
test.assertAlmostEqual = function(expected, found) {
  test.totalCount++
  test.subCount++
  
  if (Math.abs((found - expected) / expected) < 0.001) {
    //debugmsg(".")
  }
  else {
    test.printTitle();
    debugmsg("Expected: " + expected)
    debugmsg("...Found: " + found)
    debugmsg(" ")
  }
}

test.assertMatch = function(expected, found) {
  test.totalCount++
  test.subCount++
  if (expected.test(found)) {
    //debugmsg(".")
  }
  else {
    test.printTitle();
    debugmsg("Expected: " + expected)
    debugmsg("...Found: " + found)
    debugmsg(" ")
  }
}

test.fail = function(msg) {
  test.printTitle()
  debugmsg("Failure: " + msg)
  debugmsg(" ")
}

test.results = function(time) {
  const elapsed = parseInt(Date.now()) - time
  debugmsg("Number of tests: " + test.totalCount)
  debugmsg("Number of fails: " + test.failCount)
  debugmsg("Elapsed time: " + elapsed + " ms (" + (Math.round(elapsed / test.totalCount * 10) / 10) + " ms/test)")
}

test.padArray = function(arr, n) {
  for (let i = 0; i < n; i++) arr.push(/./)
  return arr
}


// You can use this in a test to move the player silently
test.movePlayer = function(roomName) {
  game.player.loc = roomName
  game.update()
}  
  