Set oShell = CreateObject("WScript.Shell")
oShell.Environment("Process")("HYRUP_EMPLOYEE_NAME") = "Anmol"
oShell.Run "C:\HyrUp\HyrUpCollector.exe", 0, False
