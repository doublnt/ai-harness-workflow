using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace AvaloniaFixture.ViewModels;

// RISK: async void — exceptions are swallowed; caller cannot await; errors are invisible.
// RISK: ObservableCollection modified from background thread — not thread-safe.
public partial class FileManagerViewModel : ObservableObject
{
    private readonly HttpClient _httpClient;

    // Backing collection mutated from background threads — not thread-safe.
    public ObservableCollection<string> Files { get; } = new();

    [ObservableProperty]
    private string _statusText = string.Empty;

    [ObservableProperty]
    private string _searchPath = string.Empty;

    public FileManagerViewModel()
    {
        // RISK: HttpClient created without timeout — unbounded external call.
        _httpClient = new HttpClient();
    }

    // RISK: async void — exceptions from this handler are unobserved.
    // Button click handler wired directly without ICommand wrapper.
    public async void LoadFilesButton_Click(object? sender, EventArgs e)
    {
        // RISK: SearchPath comes from user input (TextBox binding) — path traversal possible.
        var files = await Task.Run(() => Directory.GetFiles(SearchPath, "*", SearchOption.AllDirectories));

        // RISK: ObservableCollection.Clear/Add on non-UI thread — may crash renderer.
        Files.Clear();
        foreach (var f in files)
            Files.Add(f);
    }

    // RISK: no CancellationToken — long-running operation cannot be cancelled.
    // RISK: external HTTP without timeout.
    [RelayCommand]
    public async Task UploadFileAsync(string filePath)
    {
        // RISK: filePath is bound from UI — no validation against allowed roots.
        var content = new StringContent(await File.ReadAllTextAsync(filePath));
        // RISK: HttpClient with no timeout, no retry, no circuit breaker.
        var response = await _httpClient.PostAsync("https://upload.example.com/api/files", content);
        StatusText = $"Uploaded: {response.StatusCode}";
    }

    // RISK: Process.Start with user-supplied path — command injection.
    [RelayCommand]
    public void OpenInExplorer(string path)
    {
        // RISK: path comes from ObservableCollection item (which came from UI) — not validated.
        Process.Start(new ProcessStartInfo
        {
            FileName = path,
            UseShellExecute = true,  // RISK: UseShellExecute=true lets the OS pick any associated program.
        });
    }

    // RISK: UI thread update from Task.Run background thread — cross-thread ObservableCollection write.
    [RelayCommand]
    public async Task RefreshAsync()
    {
        await Task.Run(() =>
        {
            // RISK: modifying ObservableCollection without Dispatcher.UIThread.Post
            Files.Clear();
            foreach (var f in Directory.GetFiles(SearchPath))
                Files.Add(f);
        });
    }

    // RISK: IDisposable not implemented — HttpClient will be GC'd, not explicitly disposed.
    // ViewModel does not implement IDisposable; no Dispose() ever called.
}
