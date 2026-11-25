@REM ----------------------------------------------------------------------------
@REM Maven Wrapper Startup Script for Windows
@REM ----------------------------------------------------------------------------

@echo off
setlocal

set "MAVEN_PROJECTBASEDIR=%~dp0"

if not defined JAVA_HOME goto findJavaFromJavaHome

set "JAVACMD=%JAVA_HOME%\bin\java.exe"
goto run

:findJavaFromJavaHome
set "JAVACMD=java.exe"

:run
"%JAVACMD%" -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java could not be found.
    echo Please check your JAVA_HOME or PATH.
    exit /b 1
)

set "WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

if not exist "%WRAPPER_PROPERTIES%" (
    echo ERROR: Maven Wrapper properties file not found:
    echo %WRAPPER_PROPERTIES%
    exit /b 1
)

for /f "tokens=1,* delims==" %%A in ('findstr /b "distributionUrl=" "%WRAPPER_PROPERTIES%"') do set "DISTRIBUTION_URL=%%B"

if not defined DISTRIBUTION_URL (
    echo ERROR: distributionUrl not found.
    exit /b 1
)

set "MAVEN_VERSION=3.9.9"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%"

if exist "%MAVEN_HOME%\bin\mvn.cmd" goto execute

echo Maven %MAVEN_VERSION% is not installed.
echo Downloading Maven %MAVEN_VERSION%...

set "ZIPFILE=%TEMP%\apache-maven-%MAVEN_VERSION%-bin.zip"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '%ZIPFILE%'"

if errorlevel 1 (
    echo ERROR: Failed to download Maven.
    exit /b 1
)

if not exist "%MAVEN_HOME%" mkdir "%MAVEN_HOME%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%ZIPFILE%' -DestinationPath '%USERPROFILE%\.m2\wrapper\dists' -Force"

if errorlevel 1 (
    echo ERROR: Failed to extract Maven.
    exit /b 1
)

del "%ZIPFILE%" >nul 2>&1

:execute
"%MAVEN_HOME%\bin\mvn.cmd" %*

endlocal