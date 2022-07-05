lazy val root = project.in(file(".")).settings(scalaVersion := "3.1.1",
  libraryDependencies ++= Seq("com.github.ghostdogpr" %% "caliban" % "1.3.2",
    "com.github.ghostdogpr" %% "caliban-client" % "1.3.2",
    "com.github.ghostdogpr" %% "caliban-http4s" % "1.2.4"))