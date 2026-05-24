using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace AvaloniaFixture.Services;

// RISK: P/Invoke is the trust boundary for native interop.
// Incorrect marshaling or unchecked return values causes memory corruption or silent failures.
public static class NativeInteropService
{
    // RISK: P/Invoke with char* — caller must ensure null-terminated, correct length.
    // No CharSet specified — marshaling behavior is platform-dependent.
    [DllImport("libsystem_info")]
    private static extern int GetSystemInfo(IntPtr buffer, int size);

    // RISK: P/Invoke with pointer arithmetic — no bounds checking.
    [DllImport("libcore", EntryPoint = "core_process_data")]
    private static extern int ProcessData(IntPtr data, int length, IntPtr outBuffer);

    // RISK: exposes P/Invoke result directly without checking error code.
    public static byte[] ReadSystemInfo(int bufferSize)
    {
        IntPtr buf = Marshal.AllocHGlobal(bufferSize);
        try
        {
            // RISK: return value (error code) is ignored.
            GetSystemInfo(buf, bufferSize);
            var result = new byte[bufferSize];
            Marshal.Copy(buf, result, 0, bufferSize);
            return result;
        }
        finally
        {
            Marshal.FreeHGlobal(buf);
        }
    }

    // RISK: user-supplied path reaches shell via Process.Start with UseShellExecute.
    public static void OpenDocument(string filePath)
    {
        // RISK: filePath is not validated — could be a script, executable, or UNC path.
        Process.Start(new ProcessStartInfo
        {
            FileName = filePath,
            UseShellExecute = true,
        });
    }

    // RISK: unsafe block — pointer arithmetic with no bounds check.
    public static unsafe void XorBuffer(byte[] data, byte key)
    {
        fixed (byte* ptr = data)
        {
            for (int i = 0; i < data.Length; i++)
                ptr[i] ^= key;
        }
    }

    // RISK: Thread.Sleep in a method that may be called from UI thread — blocks UI.
    public static string PollUntilReady(string resourcePath)
    {
        for (int attempt = 0; attempt < 100; attempt++)
        {
            if (File.Exists(resourcePath))
                return File.ReadAllText(resourcePath);
            Thread.Sleep(100);  // RISK: blocking sleep, may be on UI thread.
        }
        throw new TimeoutException($"Resource not ready: {resourcePath}");
    }
}
