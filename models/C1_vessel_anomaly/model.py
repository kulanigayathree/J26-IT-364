"""Time-decay GRU autoencoder for irregularly sampled AIS windows (proposal obj. 3-4).

Idea: before every update the hidden state is decayed by exp(-relu(w*dt + b)), so a long
silence between pings weakens old memory instead of being treated like a normal 10 s step.
Reconstruction error of the kinematic channels is the anomaly signal.
Input feature index 0 is log_dt; it drives the decay and is NOT reconstructed.
"""
import time
import numpy as np
import torch
import torch.nn as nn


class TimeDecayGRUAE(nn.Module):
    def __init__(self, n_feat, hidden=64, latent=32):
        super().__init__()
        self.hidden = hidden
        self.enc_decay = nn.Linear(1, hidden)
        self.enc_cell = nn.GRUCell(n_feat, hidden)
        self.to_latent = nn.Linear(hidden, latent)
        self.from_latent = nn.Linear(latent, hidden)
        self.dec_decay = nn.Linear(1, hidden)
        self.dec_cell = nn.GRUCell(1 + latent, hidden)
        self.out = nn.Linear(hidden, n_feat - 1)

    def forward(self, x):                      # x: (B, T, F)
        B, T, _ = x.shape
        h = x.new_zeros(B, self.hidden)
        for t in range(T):
            dt = x[:, t, :1]
            h = h * torch.exp(-torch.relu(self.enc_decay(dt)))
            h = self.enc_cell(x[:, t], h)
        z = self.to_latent(h)
        h = torch.tanh(self.from_latent(z))
        outs = []
        for t in range(T):
            dt = x[:, t, :1]
            h = h * torch.exp(-torch.relu(self.dec_decay(dt)))
            h = self.dec_cell(torch.cat([dt, z], 1), h)
            outs.append(self.out(h))
        return torch.stack(outs, 1)            # (B, T, F-1)


class LSTMAE(nn.Module):
    """Plain LSTM autoencoder (second candidate model). log_dt is an ordinary input channel here; no time-decay."""
    def __init__(self, n_feat, hidden=64, latent=32):
        super().__init__()
        self.enc = nn.LSTM(n_feat, hidden, batch_first=True)
        self.to_latent = nn.Linear(hidden, latent)
        self.dec = nn.LSTM(1 + latent, hidden, batch_first=True)
        self.out = nn.Linear(hidden, n_feat - 1)

    def forward(self, x):                      # x: (B, T, F)
        B, T, _ = x.shape
        _, (h, _) = self.enc(x)
        z = self.to_latent(h[-1])
        dec_in = torch.cat([x[:, :, :1], z.unsqueeze(1).expand(B, T, z.shape[1])], 2)
        y, _ = self.dec(dec_in)
        return self.out(y)                     # (B, T, F-1)


ARCHS = {"gru": TimeDecayGRUAE, "lstm": LSTMAE}
ARCH_LABEL = {"gru": "TimeDecay-GRU-AE", "lstm": "LSTM-AE"}


def build_model(arch, n_feat, hidden, latent):
    return ARCHS[arch](n_feat, hidden, latent)


def _loss(model, xb):
    return ((model(xb) - xb[:, :, 1:]) ** 2).mean()


def train_model(X_tr, X_es, cfg, device="cpu", log=print, arch="gru"):
    m = cfg["model"]
    model = build_model(arch, X_tr.shape[-1], m["hidden"], m["latent"]).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=m["lr"])
    tr = torch.from_numpy(X_tr)
    es = torch.from_numpy(X_es).to(device)
    best, best_state, bad = 1e9, None, 0
    for ep in range(1, m["epochs"] + 1):
        model.train()
        perm = torch.randperm(len(tr))
        tot, nb = 0.0, 0
        for s in range(0, len(tr), m["batch_size"]):
            xb = tr[perm[s:s + m["batch_size"]]].to(device)
            opt.zero_grad()
            loss = _loss(model, xb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot += loss.item()
            nb += 1
        model.eval()
        with torch.no_grad():
            es_loss = float(np.mean([_loss(model, es[s:s + 1024]).item() for s in range(0, len(es), 1024)]))
        log(f"epoch {ep:02d}  train_loss={tot / nb:.4f}  clean_holdout_loss={es_loss:.4f}")
        if es_loss < best - 1e-4:
            best, bad = es_loss, 0
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= m["patience"]:
                log("early stopping")
                break
    model.load_state_dict(best_state)
    model.eval()
    return model


@torch.no_grad()
def reconstruction_error(model, X, device="cpu", bs=1024):
    model.eval()
    errs = []
    for s in range(0, len(X), bs):
        xb = torch.from_numpy(X[s:s + bs]).to(device)
        errs.append(((model(xb) - xb[:, :, 1:]) ** 2).mean(dim=(1, 2)).cpu().numpy())
    return np.concatenate(errs)


def to_unit_score(err, ref_err, q=0.95):
    """Map error -> [0,1). The q-quantile of CLEAN data maps to 0.5; ranking is preserved."""
    s = np.quantile(ref_err, q)
    return err / (err + s + 1e-12)


@torch.no_grad()
def latency_ms(model, X, n=200, device="cpu"):
    model.eval()
    n = min(n, len(X))
    t = []
    for i in range(n):
        xb = torch.from_numpy(X[i:i + 1]).to(device)
        t0 = time.perf_counter()
        model(xb)
        t.append((time.perf_counter() - t0) * 1000)
    return float(np.mean(t)), float(np.percentile(t, 95))
