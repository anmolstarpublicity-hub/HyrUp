Set oShell = CreateObject("WScript.Shell")
oShell.Environment("Process")("HYRUP_EMPLOYEE_NAME") = "Anmol"
oShell.Environment("Process")("HYRUP_API_URL") = "https://web-copy-production-a84f.up.railway.app"
oShell.Run "C:\HyrUp\HyrUpCollector.exe", 0, False
