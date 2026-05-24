using System;
using System.Threading;
using System.Threading.Tasks;
using System.Net.Http;
using System.Collections.ObjectModel;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace AvaloniaFixture.ViewModels;

// RISK: ViewModel does not implement IDisposable — CancellationTokenSource never cancelled.
// RISK: no IDisposable pattern — multiple HttpClient instances created per ViewModel.
public partial class SettingsViewModel : ObservableObject
{
    private CancellationTokenSource? _cts;

    [ObservableProperty]
    private string _serverUrl = string.Empty;

    [ObservableProperty]
    private ObservableCollection<string> _logs = new();

    // RISK: HttpClient created per-call — socket exhaustion risk.
    [RelayCommand]
    public async Task TestConnectionAsync()
    {
        // RISK: new HttpClient per call causes socket exhaustion under load.
        using var client = new HttpClient();
        // RISK: no timeout set on this HttpClient.
        var result = await client.GetStringAsync(ServerUrl);
        // RISK: UI property update from awaited continuation — may not be on UI thread.
        Logs.Add($"Connected: {result.Length} bytes");
    }

    // RISK: CancellationTokenSource created but never stored, so StartLongOp
    // cannot be cancelled from StopLongOp.
    [RelayCommand]
    public async Task StartLongOpAsync()
    {
        _cts = new CancellationTokenSource();
        await Task.Run(async () =>
        {
            for (int i = 0; i < 1000; i++)
            {
                // RISK: CancellationToken is not passed into Task.Delay — cancellation has no effect.
                await Task.Delay(100);
                // RISK: ObservableCollection modified from background thread.
                Logs.Add($"Step {i}");
            }
        });
    }

    [RelayCommand]
    public void StopLongOp()
    {
        // RISK: _cts may be null if StartLongOpAsync was never called; NRE.
        // Also: even if called, the token is not passed to Task.Delay above, so no effect.
        _cts?.Cancel();
    }

    // RISK: async void — exceptions are unobserved, cannot be awaited.
    public async void AutoSave()
    {
        await Task.Delay(5000);
        // RISK: Logs modified without Dispatcher.UIThread.InvokeAsync.
        Logs.Add("Auto-saved");
    }
}
