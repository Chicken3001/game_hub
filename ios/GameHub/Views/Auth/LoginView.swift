import SwiftUI

struct LoginView: View {
    @State private var viewModel = AuthViewModel()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.hubBackground, Color(hex: "#E9E4FF")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(
                                LinearGradient(
                                    colors: [.hubAccent, .hubIndigo],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 88, height: 88)
                            .shadow(color: .hubAccent.opacity(0.4), radius: 18)

                        Text("🎮")
                            .font(.system(size: 44))
                    }

                    Text("Game Hub")
                        .font(.system(size: 32, weight: .black))
                        .foregroundStyle(Color.hubInk)

                    Text("Sign in to play")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.hubAccent)
                }
                .padding(.bottom, 28)

                VStack(spacing: 14) {
                    TextField("Email", text: $viewModel.email)
                        .textFieldStyle(HubFieldStyle())
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    PasswordField(password: $viewModel.password)

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.hubRose)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Color.hubRoseBg)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        Task { await viewModel.signIn() }
                    } label: {
                        Group {
                            if viewModel.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Sign In").font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(
                                colors: [.hubAccent, .hubIndigo],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .shadow(color: Color.hubAccent.opacity(0.3), radius: 10)
                    }
                    .disabled(viewModel.isLoading)
                }
                .hubCard()
                .padding(.horizontal, 24)

                Spacer()
            }
        }
    }
}

private struct PasswordField: View {
    @Binding var password: String
    @State private var localPassword = ""

    var body: some View {
        SecureField("Password", text: $localPassword)
            .textFieldStyle(HubFieldStyle())
            .textContentType(.password)
            .onChange(of: localPassword) { _, newValue in
                password = newValue
            }
            .onChange(of: password) { _, newValue in
                if newValue != localPassword { localPassword = newValue }
            }
    }
}

struct HubFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(hex: "#F8F6FF"))
            .foregroundStyle(Color.hubInk)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.hubCardBorder, lineWidth: 1.5)
            )
    }
}
