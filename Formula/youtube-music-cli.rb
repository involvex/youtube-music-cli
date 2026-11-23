class YoutubeMusicCli < Formula
  desc "Terminal YouTube Music player"
  homepage "https://github.com/involvex/youtube-music-cli"
  url "https://registry.npmjs.org/@involvex/youtube-music-cli/-/youtube-music-cli-0.3.12.tgz"
  sha256 "09de3c8f75420761221c2ea5993a3a2ee32f216d99b88da6351d6444957a3ecb"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    assert_match "youtube-music-cli", shell_output("#{bin}/youtube-music-cli --help")
  end
end
