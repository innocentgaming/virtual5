Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("test-audio.wav")
$synth.Speak("Welcome to EventWise AI, an intelligent event planning assistant.")
$synth.Dispose()
Write-Output "Generated test-audio.wav with size: $((Get-Item test-audio.wav).Length) bytes"
