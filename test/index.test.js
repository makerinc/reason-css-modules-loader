const {
    pathAndFilename,
    filterNonCamelCaseNames,
    filterKeywords,
    makeCssModuleType,
    finalDestDir,
} = require('../src/index')

test('correct path and filename', () => {
    const { currentDir, destFilename } = pathAndFilename("/app/File.css");

    expect(currentDir).toBe("/app");
    expect(destFilename).toBe("FileStyles.re");
})

test('correct path and filename for .module.css', () => {
    const { currentDir, destFilename } = pathAndFilename("/app/File.module.css");

    expect(currentDir).toBe("/app");
    expect(destFilename).toBe("FileStyles.re");
})

test('filter non-camel-cased items', () => {
    let classNames = [
        'red',
        'blue',
        'is-read',
        'is_read',
        'isRead',
        'title-box',
        'titleBox',
    ]

    expect(filterNonCamelCaseNames(classNames)).toEqual([
        'red',
        'blue',
        'isRead',
        'titleBox',
    ])
})

test('rename items whose name is reserved word', () => {
    let classNames = [
        'red',
        'and',
        'forYou',
        'includeNext',
        'let',
    ]

    let { validNames, keywordNames } = filterKeywords(classNames)

    expect(validNames).toEqual([
        'red',
        'forYou',
        'includeNext',
    ])
    expect(keywordNames).toEqual([
        'and',
        'let',
    ])
})

test('create valid ReasonML type', () => {
    let classNames = [
        'red',
        'forYou',
        'includeNext',
    ]

    expect(makeCssModuleType(classNames)).toBe(`
type definition = Js.t({.
    red: string,
    forYou: string,
    includeNext: string,
})
    `.trim())
})

describe('finalDestDir() tests', () => {
    test('queryDestDir if set in query', () => {
        let queryDestDir = "/app/"

        expect(finalDestDir(queryDestDir, "/src/")).toBe(queryDestDir)
    })

    test('./src/styles if not set in query', () => {
        let queryDestDir;

        expect(finalDestDir(queryDestDir, "/src/")).toBe('./src/styles')
    })

    test('currentDirectory if query.destDir is "current"', () => {
        let queryDestDir = "current";

        expect(finalDestDir(queryDestDir, "/src/")).toBe("/src/")
    })
})