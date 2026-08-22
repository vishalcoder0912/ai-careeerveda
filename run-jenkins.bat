@echo off
REM Run Jenkins locally on Windows without Docker
REM Prerequisites: Java 21+, Node.js 22+, Docker Desktop (for E2E/docker stages)

echo Starting Jenkins on port 8085...

REM Download Jenkins WAR if not exists
if not exist jenkins.war (
    echo Downloading Jenkins LTS...
    curl -L -o jenkins.war https://get.jenkins.io/war-stable/latest/jenkins.war
)

REM Set Jenkins home
set JENKINS_HOME=%CD%\jenkins_home

REM Run Jenkins
java -DJENKINS_HOME=%JENKINS_HOME% -jar jenkins.war --httpPort=8085 --prefix=/jenkins

echo.
echo Jenkins running at: http://localhost:8085/jenkins
echo Admin password: type %JENKINS_HOME%\secrets\initialAdminPassword